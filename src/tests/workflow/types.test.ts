import { describe, it, expect } from 'vitest';
import {
  extractAllPdfs,
  extractSinglePdf,
  SocketData,
  PDFData,
  MultiPDFData,
  ImageData,
} from '../../js/workflow/types';
import { PDFDocument } from 'pdf-lib';

describe('workflow types', () => {
  const createMockPdfData = (): PDFData => ({
    type: 'pdf',
    document: {} as PDFDocument,
    bytes: new Uint8Array([1, 2, 3]),
    filename: 'test.pdf',
  });

  const createMockImageData = (): ImageData => ({
    type: 'image',
    blob: new Blob(),
    filename: 'test.jpg',
  });

  const createMockMultiPdfData = (items: PDFData[]): MultiPDFData => ({
    type: 'multi-pdf',
    items,
  });

  describe('extractAllPdfs', () => {
    it('should flatten mixed arrays correctly', () => {
      const pdf1 = createMockPdfData();
      const pdf2 = createMockPdfData();
      const pdf3 = createMockPdfData();

      const mixedInputs: SocketData[] = [
        pdf1,
        createMockImageData(), // Should be ignored
        createMockMultiPdfData([pdf2, pdf3]),
        createMockImageData(), // Should be ignored
      ];

      const result = extractAllPdfs(mixedInputs);

      expect(result).toHaveLength(3);
      // It clones the pdf so we check the fields
      expect(result[0].bytes).toEqual(pdf1.bytes);
      expect(result[1].bytes).toEqual(pdf2.bytes);
      expect(result[2].bytes).toEqual(pdf3.bytes);
    });

    it('should handle empty arrays', () => {
      const result = extractAllPdfs([]);
      expect(result).toHaveLength(0);
    });

    it('should ignore non-pdf items', () => {
      const result = extractAllPdfs([createMockImageData()]);
      expect(result).toHaveLength(0);
    });

    it('should handle empty multi-pdf arrays', () => {
      const result = extractAllPdfs([createMockMultiPdfData([])]);
      expect(result).toHaveLength(0);
    });
  });

  describe('extractSinglePdf', () => {
    it('should extract a single pdf', () => {
      const pdf = createMockPdfData();
      const result = extractSinglePdf(pdf);
      expect(result.bytes).toEqual(pdf.bytes);
    });

    it('should extract first pdf from multi-pdf', () => {
      const pdf1 = createMockPdfData();
      const pdf2 = createMockPdfData();
      const multi = createMockMultiPdfData([pdf1, pdf2]);

      const result = extractSinglePdf(multi);
      expect(result.bytes).toEqual(pdf1.bytes);
    });

    it('should throw error for empty multi-pdf', () => {
      const multi = createMockMultiPdfData([]);
      expect(() => extractSinglePdf(multi)).toThrow();
    });

    it('should throw error for non-pdf inputs', () => {
      const image = createMockImageData();
      expect(() => extractSinglePdf(image)).toThrow();
    });
  });
});
