import { describe, expect, it, vi } from 'vitest';
import {
  extractPageModel,
  shouldInsertSpaceBetweenItems,
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

    const consoleSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    await extractPageModel(mockPage, mockViewport);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to resolve font name for "g_d0_f1"',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});