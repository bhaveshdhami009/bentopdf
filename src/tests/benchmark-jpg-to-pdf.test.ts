import { describe, it, vi, expect } from 'vitest';
import { compressImageFile } from '../js/utils/image-compress';

describe('Benchmark compression logic in jpg-to-pdf-page', () => {
  it('measures sequential vs parallel', async () => {
    // Mock the browser globals for canvas and object URLs
    const originalCreateElement = document.createElement.bind(document);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    globalThis.Image = class {
      naturalWidth = 1000;
      naturalHeight = 1000;
      onload: (() => void) | null = null;
      set src(_: string) {
        setTimeout(() => this.onload?.(), 10);
      }
    } as unknown as typeof Image;

    document.createElement = ((tagName: string) => {
      if (tagName !== 'canvas') {
        return originalCreateElement(tagName);
      }
      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({ drawImage: vi.fn() })),
        toBlob: vi.fn((cb: (b: Blob) => void) => {
          setTimeout(() => cb(new Blob(['test'], { type: 'image/jpeg' })), 50); // Simulate compression time
        }),
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement;

    // Simulate the files input
    const files = Array(10).fill(
      new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    );

    // 1. Simulate the current sequential code
    const startSeq = performance.now();
    const compressedFilesSeq: File[] = [];
    for (const file of files) {
      compressedFilesSeq.push(await compressImageFile(file, 'medium'));
    }
    const endSeq = performance.now();
    const timeSeq = endSeq - startSeq;
    console.log(`Sequential: ${timeSeq}ms`);

    // 2. Simulate the new parallel code
    const startPar = performance.now();
    const compressedFilesPar = await Promise.all(
      files.map((file) => compressImageFile(file, 'medium'))
    );
    const endPar = performance.now();
    const timePar = endPar - startPar;
    console.log(`Parallel: ${timePar}ms`);

    // Both should yield the same length array
    expect(compressedFilesSeq.length).toBe(files.length);
    expect(compressedFilesPar.length).toBe(files.length);

    // Assert parallel is faster by a notable margin for multiple simulated async delays
    expect(timePar).toBeLessThan(timeSeq);

    // Restore globals
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
