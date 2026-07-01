import { describe, it, expect, vi } from 'vitest';

vi.mock('../js/utils/image-compress.js', async () => {
  return {
    compressImageFile: vi.fn(async (file, quality) => {
      return new Promise((resolve) => setTimeout(() => resolve(file), 10)); // Simulate 10ms compression
    }),
  };
});

vi.mock('../js/utils/image-input-utils.js', async () => {
  return {
    preprocessImageFile: vi.fn(async (file) => {
      return new Promise((resolve) => setTimeout(() => resolve(file), 10)); // Simulate 10ms preprocessing
    }),
  };
});

import { compressImageFile } from '../js/utils/image-compress.js';
import { preprocessImageFile } from '../js/utils/image-input-utils.js';

describe('Benchmark image processing loop', () => {
  it('measures execution time of old vs new', async () => {
    const files = Array.from({ length: 10 }).map(
      (_, i) => new File([''], `image${i}.jpg`, { type: 'image/jpeg' })
    );
    const quality = 'medium';

    const startSequential = performance.now();
    const processedFilesSequential = [];
    for (const file of files) {
      const processed = await preprocessImageFile(file);
      const compressed = await compressImageFile(processed, quality);
      processedFilesSequential.push(compressed);
    }
    const endSequential = performance.now();

    const startParallel = performance.now();
    const processedFilesParallel = await Promise.all(
      files.map(async (file) => {
        const processed = await preprocessImageFile(file);
        return await compressImageFile(processed, quality);
      })
    );
    const endParallel = performance.now();

    expect(processedFilesParallel).toEqual(processedFilesSequential);
    expect(endParallel - startParallel).toBeLessThan(
      endSequential - startSequential
    );
  });
});
