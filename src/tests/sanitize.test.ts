import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PDFDocument, PDFName, PDFForm } from 'pdf-lib';
import { sanitizePdf, defaultSanitizeOptions } from '../js/utils/sanitize';

vi.mock('../js/utils/load-pdf-document', () => {
  return {
    loadPdfDocument: vi.fn(),
  };
});

describe('sanitizePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes AcroForm when flattenForms fails', async () => {
    const { loadPdfDocument } = await import('../js/utils/load-pdf-document');

    // Create a real PDF document to serve as our mock base
    const pdfDoc = await PDFDocument.create();

    // Create a mock AcroForm dict in the catalog
    const context = pdfDoc.context;
    const acroFormDict = context.obj({});
    pdfDoc.catalog.set(PDFName.of('AcroForm'), context.register(acroFormDict));

    expect(pdfDoc.catalog.has(PDFName.of('AcroForm'))).toBe(true);

    // Mock getForm to return an object whose flatten throws
    vi.spyOn(pdfDoc, 'getForm').mockReturnValue({
      flatten: () => {
        throw new Error('Mock flatten error');
      },
    } as unknown as PDFForm);

    // Mock loadPdfDocument to return our rigged pdfDoc
    vi.mocked(loadPdfDocument).mockResolvedValue(pdfDoc);

    const pdfBytes = new Uint8Array([1, 2, 3]); // dummy bytes

    // Spy on console.warn to keep the output clean and verify it was called
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await sanitizePdf(pdfBytes, {
      ...defaultSanitizeOptions,
      flattenForms: true,
    });

    // The error should be caught and logged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not flatten forms: Mock flatten error')
    );

    // AcroForm should have been deleted from the catalog as a fallback
    expect(pdfDoc.catalog.has(PDFName.of('AcroForm'))).toBe(false);

    warnSpy.mockRestore();
  });
});
