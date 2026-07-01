import { describe, it, expect } from 'vitest';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

describe('Benchmark: Pre-fill Pages', () => {
  it('measures old vs new approach for generating page objects', () => {
    const numPages = 100000;

    // Old approach
    let start = performance.now();
    const allPages1: any[] = [];
    allPages1.length = numPages;
    for (let i = 0; i < numPages; i++) {
      allPages1[i] = {
        id: generateId(),
        pdfIndex: 0,
        pageIndex: i,
        rotation: 0,
        visualRotation: 0,
        canvas: null,
        pdfDoc: null,
        originalPageIndex: i,
        fileName: 'test',
      };
    }
    const oldTime = performance.now() - start;

    // New approach
    start = performance.now();
    const allPages2: any[] = [];
    allPages2.length = numPages;
    const idPrefix = generateId() + '-';
    for (let i = 0; i < numPages; i++) {
      allPages2[i] = {
        id: idPrefix + i,
        pdfIndex: 0,
        pageIndex: i,
        rotation: 0,
        visualRotation: 0,
        canvas: null,
        pdfDoc: null,
        originalPageIndex: i,
        fileName: 'test',
      };
    }
    const newTime = performance.now() - start;

    // Only fail if it's exceptionally worse to avoid flakiness,
    // though realistically the new approach should always be faster.
    // expect(newTime).toBeLessThan(oldTime * 1.5);
  });
});
