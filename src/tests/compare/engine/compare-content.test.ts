import { describe, it, expect } from 'vitest';
import {
  classifyChangeCategory,
  diffAnnotations,
  diffImages,
  detectBackgroundChanges,
  buildCategorySummary,
} from '../../../js/compare/engine/compare-content.ts';
import type {
  CompareTextChange,
  CompareAnnotation,
  CompareImageRef,
  ComparePageModel,
  CompareRectangle,
} from '../../../js/compare/types.ts';

describe('compare-content engine', () => {
  describe('classifyChangeCategory', () => {
    it('returns formatting for style-changed', () => {
      const change = {
        type: 'style-changed',
        beforeRects: [],
        afterRects: [],
      } as unknown as CompareTextChange;
      expect(classifyChangeCategory(change, 1000)).toBe('formatting');
    });

    it('returns header-footer for rects in top zone', () => {
      const change = {
        type: 'modified',
        beforeRects: [{ x: 10, y: 10, width: 50, height: 20 }], // top 12% of 1000 is 120
        afterRects: [],
      } as unknown as CompareTextChange;
      expect(classifyChangeCategory(change, 1000)).toBe('header-footer');
    });

    it('returns header-footer for rects in bottom zone', () => {
      const change = {
        type: 'modified',
        beforeRects: [],
        afterRects: [{ x: 10, y: 950, width: 50, height: 20 }], // bottom 12% is > 880
      } as unknown as CompareTextChange;
      expect(classifyChangeCategory(change, 1000)).toBe('header-footer');
    });

    it('returns text for rects in middle of page', () => {
      const change = {
        type: 'modified',
        beforeRects: [{ x: 10, y: 500, width: 50, height: 20 }],
        afterRects: [],
      } as unknown as CompareTextChange;
      expect(classifyChangeCategory(change, 1000)).toBe('text');
    });
  });

  describe('diffAnnotations', () => {
    it('identifies removed annotations', () => {
      const before: CompareAnnotation[] = [
        {
          id: '1',
          subtype: 'Text',
          rect: { x: 0, y: 0, width: 10, height: 10 },
          contents: 'note',
          title: 'author',
          color: 'red',
        },
      ];
      const after: CompareAnnotation[] = [];
      const diff = diffAnnotations(before, after, 1);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('removed');
      expect(diff[0].category).toBe('annotation');
      expect(diff[0].id).toBe('annotation-removed-1');
      expect(diff[0].beforeText).toBe('note');
    });

    it('identifies added annotations', () => {
      const before: CompareAnnotation[] = [];
      const after: CompareAnnotation[] = [
        {
          id: '1',
          subtype: 'Text',
          rect: { x: 0, y: 0, width: 10, height: 10 },
          contents: 'note',
          title: 'author',
          color: 'red',
        },
      ];
      const diff = diffAnnotations(before, after, 1);

      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('added');
      expect(diff[0].description).toBe('Added Text annotation: "note"');
    });

    it('ignores highlights without content/title', () => {
      const before: CompareAnnotation[] = [
        {
          id: '1',
          subtype: 'Highlight',
          rect: { x: 0, y: 0, width: 10, height: 10 },
          contents: '',
          title: '',
          color: 'yellow',
        },
      ];
      const diff = diffAnnotations(before, [], 1);
      expect(diff).toHaveLength(0);
    });

    it('identifies unchanged annotations', () => {
      const before: CompareAnnotation[] = [
        {
          id: '1',
          subtype: 'Text',
          rect: { x: 0, y: 0, width: 10, height: 10 },
          contents: 'note',
          title: '',
          color: '',
        },
      ];
      const after: CompareAnnotation[] = [
        {
          id: '1',
          subtype: 'Text',
          rect: { x: 0, y: 0, width: 10, height: 10 },
          contents: 'note',
          title: '',
          color: '',
        },
      ];
      const diff = diffAnnotations(before, after, 1);
      expect(diff).toHaveLength(0);
    });
  });

  describe('diffImages', () => {
    it('identifies removed images', () => {
      const before: CompareImageRef[] = [
        {
          id: 'img1',
          rect: { x: 0, y: 0, width: 100, height: 100 },
          width: 100,
          height: 100,
        },
      ];
      const diff = diffImages(before, [], 1);
      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('removed');
      expect(diff[0].category).toBe('image');
    });

    it('identifies added images', () => {
      const after: CompareImageRef[] = [
        {
          id: 'img1',
          rect: { x: 0, y: 0, width: 100, height: 100 },
          width: 100,
          height: 100,
        },
      ];
      const diff = diffImages([], after, 1);
      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('added');
      expect(diff[0].category).toBe('image');
    });

    it('identifies resized/modified images based on overlap', () => {
      const before: CompareImageRef[] = [
        {
          id: 'img1',
          rect: { x: 0, y: 0, width: 100, height: 100 },
          width: 100,
          height: 100,
        },
      ];
      const after: CompareImageRef[] = [
        {
          id: 'img2',
          rect: { x: 10, y: 10, width: 120, height: 120 },
          width: 120,
          height: 120,
        },
      ];

      const diff = diffImages(before, after, 1);
      expect(diff).toHaveLength(1);
      expect(diff[0].type).toBe('modified');
      expect(diff[0].description).toContain('Image resized');
    });
  });

  describe('detectBackgroundChanges', () => {
    const leftModel = { width: 1000, height: 1000 } as ComparePageModel;
    const rightModel = { width: 1000, height: 1000 } as ComparePageModel;

    it('returns empty when visual mismatch ratio is < 0.01', () => {
      const diff = detectBackgroundChanges(leftModel, rightModel, 0.005, [], 1);
      expect(diff).toHaveLength(0);
    });

    it('returns empty when visual mismatch is explained by text changes', () => {
      const textRects: CompareRectangle[] = [
        { x: 0, y: 0, width: 500, height: 500 },
      ]; // 0.25 coverage
      const diff = detectBackgroundChanges(
        leftModel,
        rightModel,
        0.28,
        textRects,
        1
      ); // < 0.25 + 0.05
      expect(diff).toHaveLength(0);
    });

    it('returns background change when visual mismatch exceeds text changes', () => {
      const textRects: CompareRectangle[] = [
        { x: 0, y: 0, width: 500, height: 500 },
      ]; // 0.25 coverage
      const diff = detectBackgroundChanges(
        leftModel,
        rightModel,
        0.35,
        textRects,
        1
      ); // > 0.25 + 0.05
      expect(diff).toHaveLength(1);
      expect(diff[0].category).toBe('background');
    });
  });

  describe('buildCategorySummary', () => {
    it('correctly builds a summary of categories', () => {
      const changes = [
        { category: 'text' },
        { category: 'text' },
        { category: 'image' },
        { category: 'annotation' },
        { category: 'formatting' },
      ] as CompareTextChange[];

      const summary = buildCategorySummary(changes);

      expect(summary).toEqual({
        text: 2,
        image: 1,
        'header-footer': 0,
        annotation: 1,
        formatting: 1,
        background: 0,
      });
    });
  });
});
