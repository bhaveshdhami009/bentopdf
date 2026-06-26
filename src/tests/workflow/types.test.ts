import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requirePdfInput,
  WorkflowError,
  extractSinglePdf,
  extractAllPdfs,
  processBatch,
  SocketData,
  PDFData,
  MultiPDFData,
  ImageData,
} from '../../js/workflow/types';
import * as errorsModule from '../../js/workflow/errors';
import { PDFDocument } from 'pdf-lib';

vi.mock('../../js/workflow/errors', () => ({
  wfError: vi.fn((key) => `MOCKED_ERROR_${key}`),
}));

describe('workflow types', () => {
  const createMockPdfData = (filename: string = 'test.pdf'): PDFData => ({
    type: 'pdf',
    document: {} as PDFDocument,
    bytes: new Uint8Array([1, 2, 3]),
    filename,
  });

  const createMockImageData = (filename: string = 'test.jpg'): ImageData => ({
    type: 'image',
    blob: new Blob(),
    filename,
  });

  const createMockMultiPdfData = (items: PDFData[]): MultiPDFData => ({
    type: 'multi-pdf',
    items,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WorkflowError', () => {
    it('should format message with nodeName when provided', () => {
      const error = new WorkflowError('Test message', 'TestNode');
      expect(error.message).toBe('TestNode: Test message');
      expect(error.nodeName).toBe('TestNode');
      expect(error.name).toBe('WorkflowError');
    });

    it('should format message without nodeName when not provided', () => {
      const error = new WorkflowError('Test message');
      expect(error.message).toBe('Test message');
      expect(error.nodeName).toBeUndefined();
      expect(error.name).toBe('WorkflowError');
    });
  });

  describe('requirePdfInput', () => {
    it('should throw WorkflowError when inputs object is empty', () => {
      expect(() => requirePdfInput({}, 'TestNode')).toThrow(WorkflowError);
      expect(() => requirePdfInput({}, 'TestNode')).toThrow(
        'TestNode: No PDF connected'
      );
    });

    it('should throw WorkflowError when pdf input is missing', () => {
      expect(() =>
        requirePdfInput({ other: [createMockImageData()] }, 'TestNode')
      ).toThrow(WorkflowError);
    });

    it('should throw WorkflowError when pdf input array is empty', () => {
      expect(() => requirePdfInput({ pdf: [] }, 'TestNode')).toThrow(
        WorkflowError
      );
    });

    it('should return the pdf input array when present', () => {
      const mockInput = [createMockPdfData('test.pdf')];
      expect(requirePdfInput({ pdf: mockInput }, 'TestNode')).toBe(mockInput);
    });
  });

  describe('extractSinglePdf', () => {
    it('should return clone of pdf when input is single pdf', () => {
      const input = createMockPdfData('test.pdf');
      const result = extractSinglePdf(input);
      expect(result).not.toBe(input); // Should be a clone
      expect(result.bytes).not.toBe(input.bytes); // Bytes should be cloned
      expect(result.filename).toBe('test.pdf');
      expect(result.bytes).toEqual(input.bytes);
    });

    it('should return clone of first pdf when input is multi-pdf', () => {
      const pdf1 = createMockPdfData('1.pdf');
      const pdf2 = createMockPdfData('2.pdf');
      const input = createMockMultiPdfData([pdf1, pdf2]);

      const result = extractSinglePdf(input);
      expect(result).not.toBe(pdf1); // Should be a clone
      expect(result.bytes).not.toBe(pdf1.bytes); // Bytes should be cloned
      expect(result.filename).toBe('1.pdf');
      expect(result.bytes).toEqual(pdf1.bytes);
    });

    it('should throw error when multi-pdf is empty', () => {
      const input = createMockMultiPdfData([]);
      expect(() => extractSinglePdf(input)).toThrow('MOCKED_ERROR_noPdfInputs');
      expect(errorsModule.wfError).toHaveBeenCalledWith('noPdfInputs');
    });

    it('should throw error when input is image', () => {
      const input = createMockImageData('test.jpg');
      expect(() => extractSinglePdf(input)).toThrow(
        'MOCKED_ERROR_expectedPdfInput'
      );
      expect(errorsModule.wfError).toHaveBeenCalledWith('expectedPdfInput');
    });
  });

  describe('extractAllPdfs', () => {
    it('should flatten mixed arrays correctly and extract from multi-pdfs', () => {
      const pdf1 = createMockPdfData('1.pdf');
      const pdf2 = createMockPdfData('2.pdf');
      const pdf3 = createMockPdfData('3.pdf');

      const mixedInputs: SocketData[] = [
        pdf1,
        createMockImageData(), // Should be ignored
        createMockMultiPdfData([pdf2, pdf3]),
        createMockImageData(), // Should be ignored
      ];

      const result = extractAllPdfs(mixedInputs);

      expect(result).toHaveLength(3);
      // It clones the pdf so we check the fields and references
      expect(result[0]).not.toBe(pdf1);
      expect(result[0].bytes).not.toBe(pdf1.bytes);
      expect(result[0].bytes).toEqual(pdf1.bytes);
      expect(result[0].filename).toBe('1.pdf');

      expect(result[1]).not.toBe(pdf2);
      expect(result[1].bytes).not.toBe(pdf2.bytes);
      expect(result[1].bytes).toEqual(pdf2.bytes);
      expect(result[1].filename).toBe('2.pdf');

      expect(result[2]).not.toBe(pdf3);
      expect(result[2].bytes).not.toBe(pdf3.bytes);
      expect(result[2].bytes).toEqual(pdf3.bytes);
      expect(result[2].filename).toBe('3.pdf');
    });

    it('should handle empty arrays', () => {
      const result = extractAllPdfs([]);
      expect(result).toHaveLength(0);
    });

    it('should ignore non-pdf items entirely', () => {
      const result = extractAllPdfs([createMockImageData()]);
      expect(result).toHaveLength(0);
    });

    it('should handle empty multi-pdf arrays', () => {
      const result = extractAllPdfs([createMockMultiPdfData([])]);
      expect(result).toHaveLength(0);
    });
  });

  describe('processBatch', () => {
    it('should throw error if no pdf inputs', async () => {
      await expect(processBatch([], async (pdf) => pdf)).rejects.toThrow(
        'MOCKED_ERROR_noPdfInputs'
      );
      expect(errorsModule.wfError).toHaveBeenCalledWith('noPdfInputs');
    });

    it('should process single pdf without wrapping in multi-pdf', async () => {
      const input = [createMockPdfData('test.pdf')];
      const result = await processBatch(input, async (pdf) => {
        return { ...pdf, filename: 'processed_' + pdf.filename };
      });
      expect(result.type).toBe('pdf');
      expect((result as PDFData).filename).toBe('processed_test.pdf');
    });

    it('should process multiple pdfs and wrap in multi-pdf', async () => {
      const input = [createMockPdfData('1.pdf'), createMockPdfData('2.pdf')];
      const result = await processBatch(input, async (pdf) => {
        return { ...pdf, filename: 'processed_' + pdf.filename };
      });
      expect(result.type).toBe('multi-pdf');
      expect((result as MultiPDFData).items).toHaveLength(2);
      expect((result as MultiPDFData).items[0].filename).toBe(
        'processed_1.pdf'
      );
      expect((result as MultiPDFData).items[1].filename).toBe(
        'processed_2.pdf'
      );
    });
  });
});
