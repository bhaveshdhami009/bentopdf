import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { performCondenseCompression } from '../js/utils/compress';
import { loadPyMuPDF } from '../js/utils/pymupdf-loader';
import type { PyMuPDFInstance } from '@/types';

vi.mock('../js/utils/pymupdf-loader', () => ({
  loadPyMuPDF: vi.fn(),
}));

describe('performCondenseCompression', () => {
  let mockPyMuPDF: { compressPdf: Mock };

  beforeEach(() => {
    mockPyMuPDF = {
      compressPdf: vi.fn(),
    };
    vi.mocked(loadPyMuPDF).mockResolvedValue(
      mockPyMuPDF as unknown as PyMuPDFInstance
    );
  });

  it('should use fallback options if initial compression fails', async () => {
    const fileBlob = new Blob(['test'], { type: 'application/pdf' });
    const level = 'balanced';

    const mockResult = { blob: new Blob(['result']), compressedSize: 100 };

    // Fail first call, succeed second call
    mockPyMuPDF.compressPdf
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce(mockResult);

    const result = await performCondenseCompression(fileBlob, level);

    expect(mockPyMuPDF.compressPdf).toHaveBeenCalledTimes(2);

    // Verify first call args (images.enabled: true)
    const firstCallArgs = mockPyMuPDF.compressPdf.mock.calls[0];
    expect(firstCallArgs[0]).toBe(fileBlob);
    expect(firstCallArgs[1].images.enabled).toBe(true);

    // Verify second call args (images.enabled: false)
    const secondCallArgs = mockPyMuPDF.compressPdf.mock.calls[1];
    expect(secondCallArgs[0]).toBe(fileBlob);
    expect(secondCallArgs[1].images.enabled).toBe(false);

    // Verify result includes usedFallback flag
    expect(result).toEqual({ ...mockResult, usedFallback: true });
  });

  it('should throw error if fallback compression also fails', async () => {
    const fileBlob = new Blob(['test'], { type: 'application/pdf' });
    const level = 'balanced';

    // Fail both calls
    const errorMsg = 'Fallback attempt failed';
    mockPyMuPDF.compressPdf
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error(errorMsg));

    await expect(performCondenseCompression(fileBlob, level)).rejects.toThrow(
      `PDF compression failed: ${errorMsg}`
    );

    expect(mockPyMuPDF.compressPdf).toHaveBeenCalledTimes(2);
  });
});
