import { describe, expect, it } from 'vitest';
import { shouldInsertSpaceBetweenItems } from '../../../js/compare/engine/extract-page-model';
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
      // Only properties used by shouldInsertSpaceBetweenItems and averageCharacterWidth
      // are explicitly needed, but depending on CompareTextItem definition we might need more
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
    // left ends at x=50
    const left = createMockItem('hello', 0, 50);
    // right starts at x=50, gap = 0
    const right = createMockItem('world', 50, 50);
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);

    // right starts at x=40, gap = -10
    const right2 = createMockItem('world', 40, 50);
    expect(shouldInsertSpaceBetweenItems(left, right2)).toBe(false);
  });

  it('should return true if gap is greater than threshold', () => {
    // left ends at x=50
    const left = createMockItem('hello', 0, 50); // width=50, len=5, char_width=10
    // right starts at x=60, gap=10. Threshold should be min(10,10)*0.45 = 4.5. 10 > 4.5.
    const right = createMockItem('world', 60, 50); // width=50, len=5, char_width=10
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(true);
  });

  it('should return false if gap is positive but less than threshold', () => {
    // left ends at x=50
    const left = createMockItem('hello', 0, 50); // char_width=10
    // right starts at x=52, gap=2. Threshold = max(4.5, 1.5) = 4.5. 2 < 4.5.
    const right = createMockItem('world', 52, 50); // char_width=10
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);
  });

  it('should use minimum threshold of 1.5 if character widths are very small', () => {
    // char_width = 1
    const left = createMockItem('hello', 0, 5);
    // gap = 1, char_width = 1. threshold = max(1*0.45, 1.5) = 1.5. 1 < 1.5.
    const right = createMockItem('world', 6, 5);
    expect(shouldInsertSpaceBetweenItems(left, right)).toBe(false);

    // gap = 2, threshold = 1.5. 2 >= 1.5.
    const right2 = createMockItem('world', 7, 5);
    expect(shouldInsertSpaceBetweenItems(left, right2)).toBe(true);
  });
});
