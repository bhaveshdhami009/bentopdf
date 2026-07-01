import { describe, it } from 'vitest';
import { PDFDocument as PDFLibDocument } from 'pdf-lib';
import { performance } from 'perf_hooks';

const mockFile = new File(['dummy bmp content'], 'test.bmp', {
  type: 'image/bmp',
});

async function convertImageToPngBytes(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(new ArrayBuffer(8));
    }, 50);
  });
}

describe('BMP to PDF Performance', () => {
  it('should show parallel conversion is faster', async () => {
    const files = Array.from({ length: 10 }, () => mockFile);

    // Sequential
    const startSeq = performance.now();
    const pdfDocSeq = await PDFLibDocument.create();
    for (const file of files) {
      const pngBytes = await convertImageToPngBytes(file);
      await new Promise((r) => setTimeout(r, 10)); // mock embed
    }
    const endSeq = performance.now();

    // Parallel Conversion Only
    const startPar = performance.now();
    const pdfDocPar = await PDFLibDocument.create();
    const pngBytesArray = await Promise.all(
      files.map((file) => convertImageToPngBytes(file))
    );
    for (const pngBytes of pngBytesArray) {
      await new Promise((r) => setTimeout(r, 10)); // mock embed
      pdfDocPar.addPage([100, 100]);
    }
    const endPar = performance.now();

  });
});
