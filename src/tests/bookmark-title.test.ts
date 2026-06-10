import { describe, it, expect } from 'vitest';

function cleanTitle(title: string): string {
  if (typeof title !== 'string') return title;

  let cleaned = title;

  // Sometimes spaces are incorrectly encoded as € or other characters
  // We can address the Euro symbol replacing issue
  if (cleaned.includes('€') && !cleaned.includes(' ')) {
    cleaned = cleaned.replace(/€/g, ' ');
  }

  // Remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();

  return cleaned;
}

describe('cleanTitle', () => {
  it('strips control characters', () => {
    expect(cleanTitle('Hello\x00World\x1F')).toBe('HelloWorld');
  });

  it('replaces € with space if no spaces are present', () => {
    expect(cleanTitle('Chapter€1')).toBe('Chapter 1');
  });

  it('does not replace € if spaces are present', () => {
    expect(cleanTitle('Price is 50€ for this')).toBe('Price is 50€ for this');
  });
});
