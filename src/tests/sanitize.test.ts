import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PDFDocument, PDFName, PDFForm } from 'pdf-lib';
import {
  sanitizePdf,
  defaultSanitizeOptions,
  type SanitizeOptions,
} from '../js/utils/sanitize';

vi.mock('../js/utils/load-pdf-document', () => ({
  loadPdfDocument: vi.fn(),
}));

describe('sanitizePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('removes AcroForm when flattenForms fails', async () => {
    const { loadPdfDocument } = await import('../js/utils/load-pdf-document');

    const pdfDoc = await PDFDocument.create();

    const context = pdfDoc.context;
    const acroFormDict = context.obj({});
    pdfDoc.catalog.set(
      PDFName.of('AcroForm'),
      context.register(acroFormDict)
    );

    expect(pdfDoc.catalog.has(PDFName.of('AcroForm'))).toBe(true);

    vi.spyOn(pdfDoc, 'getForm').mockReturnValue({
      flatten: () => {
        throw new Error('Mock flatten error');
      },
    } as unknown as PDFForm);

    vi.mocked(loadPdfDocument).mockResolvedValue(pdfDoc);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await sanitizePdf(
      new Uint8Array([1, 2, 3]),
      {
        ...defaultSanitizeOptions,
        flattenForms: true,
      }
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Could not flatten forms: Mock flatten error'
      )
    );

    expect(pdfDoc.catalog.has(PDFName.of('AcroForm'))).toBe(false);

    warnSpy.mockRestore();
  });

  it('should handle error when removing javascript fails', async () => {
    const { loadPdfDocument } = await import('../js/utils/load-pdf-document');

    const pdfDoc = await PDFDocument.create();

    const originalHas = pdfDoc.catalog.has.bind(pdfDoc.catalog);

    pdfDoc.catalog.has = ((name: any) => {
      if (name === PDFName.of('OpenAction')) {
        throw new Error('Test Error from Javascript removal');
      }
      return originalHas(name);
    }) as typeof pdfDoc.catalog.has;

    vi.mocked(loadPdfDocument).mockResolvedValue(pdfDoc);

    const defaultOptions: SanitizeOptions = {
      flattenForms: false,
      removeMetadata: false,
      removeAnnotations: false,
      removeJavascript: false,
      removeEmbeddedFiles: false,
      removeLayers: false,
      removeLinks: false,
      removeStructureTree: false,
      removeMarkInfo: false,
      removeFonts: false,
    };

    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    await sanitizePdf(
      new Uint8Array([1, 2, 3]),
      {
        ...defaultOptions,
        removeJavascript: true,
      }
    );

    expect(warnSpy).toHaveBeenCalledWith(
      'Could not remove JavaScript: Test Error from Javascript removal'
    );

    warnSpy.mockRestore();
  });
});