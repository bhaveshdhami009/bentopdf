import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requirePdfInput,
  WorkflowError,
  extractSinglePdf,
  extractAllPdfs,
  processBatch,
  SocketData,
  PDFData,
  MultiPDFData
} from '../js/workflow/types';
import * as errorsModule from '../js/workflow/errors';

vi.mock('../js/workflow/errors', () => ({
  wfError: vi.fn((key) => `MOCKED_ERROR_${key}`)
}));

describe('workflow types', () => {
  const createMockPdf = (filename: string): PDFData => ({
    type: 'pdf',
    document: {} as any,
    bytes: new Uint8Array([1, 2, 3]),
    filename
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
      expect(() => requirePdfInput({}, 'TestNode')).toThrow('TestNode: No PDF connected');
    });

    it('should throw WorkflowError when pdf input is missing', () => {
      expect(() => requirePdfInput({ other: [{ type: 'image', blob: new Blob(), filename: 'test.jpg' }] }, 'TestNode')).toThrow(WorkflowError);
    });

    it('should throw WorkflowError when pdf input array is empty', () => {
      expect(() => requirePdfInput({ pdf: [] }, 'TestNode')).toThrow(WorkflowError);
    });

    it('should return the pdf input array when present', () => {
      const mockInput = [createMockPdf('test.pdf')];
      expect(requirePdfInput({ pdf: mockInput }, 'TestNode')).toBe(mockInput);
    });
  });

  describe('extractSinglePdf', () => {
    it('should return clone of pdf when input is single pdf', () => {
      const input = createMockPdf('test.pdf');
      const result = extractSinglePdf(input);
      expect(result).not.toBe(input); // Should be a clone
      expect(result.bytes).not.toBe(input.bytes); // Bytes should be cloned
      expect(result.filename).toBe('test.pdf');
      expect(result.bytes).toEqual(input.bytes);
    });

    it('should return clone of first pdf when input is multi-pdf', () => {
      const input: MultiPDFData = {
        type: 'multi-pdf',
        items: [createMockPdf('1.pdf'), createMockPdf('2.pdf')]
      };
      const result = extractSinglePdf(input);
      expect(result.filename).toBe('1.pdf');
    });

    it('should throw error when multi-pdf is empty', () => {
      const input: MultiPDFData = { type: 'multi-pdf', items: [] };
      expect(() => extractSinglePdf(input)).toThrow('MOCKED_ERROR_noPdfInputs');
      expect(errorsModule.wfError).toHaveBeenCalledWith('noPdfInputs');
    });

    it('should throw error when input is image', () => {
      const input: SocketData = { type: 'image', blob: new Blob(), filename: 'test.jpg' };
      expect(() => extractSinglePdf(input)).toThrow('MOCKED_ERROR_expectedPdfInput');
      expect(errorsModule.wfError).toHaveBeenCalledWith('expectedPdfInput');
    });
  });

  describe('extractAllPdfs', () => {
    it('should extract from single pdfs', () => {
      const inputs: SocketData[] = [
        createMockPdf('1.pdf'),
        createMockPdf('2.pdf')
      ];
      const results = extractAllPdfs(inputs);
      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe('1.pdf');
      expect(results[1].filename).toBe('2.pdf');
    });

    it('should extract from multi-pdfs and flatten', () => {
      const inputs: SocketData[] = [
        { type: 'multi-pdf', items: [createMockPdf('1.pdf'), createMockPdf('2.pdf')] },
        createMockPdf('3.pdf')
      ];
      const results = extractAllPdfs(inputs);
      expect(results).toHaveLength(3);
      expect(results[0].filename).toBe('1.pdf');
      expect(results[1].filename).toBe('2.pdf');
      expect(results[2].filename).toBe('3.pdf');
    });

    it('should ignore non-pdf inputs', () => {
      const inputs: SocketData[] = [
        createMockPdf('1.pdf'),
        { type: 'image', blob: new Blob(), filename: 'img.jpg' }
      ];
      const results = extractAllPdfs(inputs);
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('1.pdf');
    });
  });

  describe('processBatch', () => {
    it('should throw error if no pdf inputs', async () => {
      await expect(processBatch([], async (pdf) => pdf)).rejects.toThrow('MOCKED_ERROR_noPdfInputs');
      expect(errorsModule.wfError).toHaveBeenCalledWith('noPdfInputs');
    });

    it('should process single pdf without wrapping in multi-pdf', async () => {
      const input = [createMockPdf('test.pdf')];
      const result = await processBatch(input, async (pdf) => {
        return { ...pdf, filename: 'processed_' + pdf.filename };
      });
      expect(result.type).toBe('pdf');
      expect((result as PDFData).filename).toBe('processed_test.pdf');
    });

    it('should process multiple pdfs and wrap in multi-pdf', async () => {
      const input = [createMockPdf('1.pdf'), createMockPdf('2.pdf')];
      const result = await processBatch(input, async (pdf) => {
        return { ...pdf, filename: 'processed_' + pdf.filename };
      });
      expect(result.type).toBe('multi-pdf');
      expect((result as MultiPDFData).items).toHaveLength(2);
      expect((result as MultiPDFData).items[0].filename).toBe('processed_1.pdf');
      expect((result as MultiPDFData).items[1].filename).toBe('processed_2.pdf');
    });
  });
});
