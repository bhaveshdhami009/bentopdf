import { describe, expect, it, vi } from 'vitest';
import {
  extractPageModel,
  shouldInsertSpaceBetweenItems,
  sortCompareTextItems,
} from '@/js/compare/engine/extract-page-model';
import type { CompareTextItem } from '../../../js/compare/types';

describe('shouldInsertSpaceBetweenItems', () => {
  const createMockItem = (
    text: string,
    x: number,
    width: number
  ): CompareTextItem =>
    ({
      id: `id-${text}`,
      normalizedText: text,
      rect: { x, y: 0, width, height: 10 },
    }) as any;

  it('should return false if text is missing', () => {
    const left = createMockItem('', 0, 10);
    const right = createMockItem('test', 15, 10);
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);

    const left2 = createMockItem('test', 0, 10);
    const right2 = createMockItem('', 15, 10);
    expect(shouldInsertSpaceBetweenItems(left2, right2)).toBe(false);
  });

  it('should return false if right text starts with punctuation', () => {
    const left = createMockItem('hello', 0, 50);
    const right = createMockItem(',', 55, 10);
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);

    const right2 = createMockItem('.', 55, 10);
    expect(shouldInsertSpaceBetweenItems(left, right2)).toBe(false);
  });

  it('should return false if left text ends with opening punctuation or dash', () => {
    const left = createMockItem('hello-', 0, 60);
    const right = createMockItem('world', 65, 50);
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);

    const left2 = createMockItem('hello(', 0, 60);
    expect(shouldInsertSpaceBetweenItems(left2, right)).toBe(false);
  });

  it('should return false if gap is less than or equal to 0', () => {
    const left = createMockItem('hello', 0, 50);

    const right = createMockItem('world', 50, 50);
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);

    const right2 = createMockItem('world', 40, 50);
    expect(shouldInsertSpaceBetweenItems(left, right2)).toBe(false);
  });

  it('should return true if gap is greater than threshold', () => {
    const left = createMockItem('hello', 0, 50);
    const right = createMockItem('world', 60, 50);

    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(true);
  });

  it('should return false if gap is positive but less than threshold', () => {
    const left = createMockItem('hello', 0, 50);
    const right = createMockItem('world', 52, 50);

    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);
  });

  it('should use minimum threshold of 1.5 if character widths are very small', () => {
    const left = createMockItem('hello', 0, 5);

    const right = createMockItem('world', 6, 5);
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);

    const right2 = createMockItem('world', 7, 5);
    expect(shouldInsertSpaceBetweenItems(left, right2)).toBe(true);
  });
});

describe('extractPageModel', () => {
  it('handles font resolution errors gracefully', async () => {
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [{ fontName: 'g_d0_f1' }],
        styles: {},
      }),
      getAnnotations: vi.fn().mockResolvedValue([]),
      getOperatorList: vi
        .fn()
        .mockResolvedValue({ fnArray: [], argsArray: [] }),
      commonObjs: {
        has: vi.fn().mockReturnValue(true),
        get: vi.fn().mockImplementation(() => {
          throw new Error('Test error resolving font');
        }),
      },
      pageNumber: 1,
    } as any;

    const mockViewport = {
      width: 800,
      height: 600,
      transform: [1, 0, 0, 1, 0, 0],
      scale: 1,
    } as any;

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await extractPageModel(mockPage, mockViewport);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to resolve font name for "g_d0_f1"',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe('sortCompareTextItems', () => {
  const createMockItem = (
    id: string,
    x: number,
    y: number,
    height: number = 10
  ): CompareTextItem =>
    ({
      id,
      normalizedText: 'text',
      rect: { x, y, width: 20, height },
    }) as any;

  it('should sort items by y position (different lines)', () => {
    // line tolerance is Math.max(Math.min(h1, h2) * 0.6, 4)
    // For height 10, tolerance is max(10 * 0.6, 4) = 6
    const topItem = createMockItem('top', 10, 10);
    const bottomItem = createMockItem('bottom', 10, 20); // y diff is 10 > 6

    const items = [bottomItem, topItem];
    const sorted = sortCompareTextItems(items);

    expect(sorted[0].id).toBe('top');
    expect(sorted[1].id).toBe('bottom');
  });

  it('should sort items by x position when on the same line (y diff <= tolerance)', () => {
    // For height 10, tolerance is 6
    const leftItem = createMockItem('left', 10, 10);
    const rightItem = createMockItem('right', 30, 12); // y diff is 2 <= 6

    const items = [rightItem, leftItem];
    const sorted = sortCompareTextItems(items);

    expect(sorted[0].id).toBe('left');
    expect(sorted[1].id).toBe('right');
  });

  it('should fallback to sorting by id when x and y are practically identical', () => {
    const itemB = createMockItem('B', 10, 10);
    const itemA = createMockItem('A', 10.5, 10); // x diff is 0.5 <= 1, y diff is 0

    const items = [itemB, itemA];
    const sorted = sortCompareTextItems(items);

    expect(sorted[0].id).toBe('A');
    expect(sorted[1].id).toBe('B');
  });

  it('should maintain original order if items are identical', () => {
    const item1 = createMockItem('A', 10, 10);
    const item2 = createMockItem('A', 10, 10);

    const items = [item1, item2];
    const sorted = sortCompareTextItems(items);

    expect(sorted[0]).toBe(item1);
    expect(sorted[1]).toBe(item2);
  });
});
