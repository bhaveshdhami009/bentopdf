import { describe, it, expect, vi } from 'vitest';

vi.mock('../js/utils/libreoffice-loader.js', () => {
  return {
    getLibreOfficeConverter: vi.fn(() => ({
      initialize: vi.fn().mockResolvedValue(undefined),
      convertToPdf: vi.fn(async (file) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(
              new Blob(['mock pdf content'], { type: 'application/pdf' })
            );
          }, 50); // Simulate 50ms conversion
        });
      }),
    })),
  };
});

import { getLibreOfficeConverter } from '../js/utils/libreoffice-loader.js';

describe('Benchmark excel conversion loop', () => {
  it('measures execution time of sequential vs parallel', async () => {
    const files = Array.from({ length: 10 }).map(
      (_, i) =>
        new File([''], `excel${i}.xlsx`, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
    );

    const converter = getLibreOfficeConverter();

    const startSequential = performance.now();
    const processedFilesSequential = [];
    for (const file of files) {
      const pdfBlob = await converter.convertToPdf(file);
      processedFilesSequential.push(pdfBlob);
    }
    const endSequential = performance.now();

    const startParallel = performance.now();
    const processedFilesParallel = await Promise.all(
      files.map(async (file) => {
        return await converter.convertToPdf(file);
      })
    );
    const endParallel = performance.now();

    expect(processedFilesParallel.length).toEqual(
      processedFilesSequential.length
    );
    expect(endParallel - startParallel).toBeLessThan(
      endSequential - startSequential
    );
  });
});
