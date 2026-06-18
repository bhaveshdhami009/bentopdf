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
    pdfDoc.catalog.set(PDFName.of('AcroForm'), context.register(acroFormDict));

    expect(pdfDoc.catalog.has(PDFName.of('AcroForm'))).toBe(true);

    vi.spyOn(pdfDoc, 'getForm').mockReturnValue({
      flatten: () => {
        throw new Error('Mock flatten error');
      },
    } as unknown as PDFForm);

    vi.mocked(loadPdfDocument).mockResolvedValue(pdfDoc);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await sanitizePdf(new Uint8Array([1, 2, 3]), {
      ...defaultSanitizeOptions,
      flattenForms: true,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not flatten forms: Mock flatten error')
    );

    expect(pdfDoc.catalog.has(PDFName.of('AcroForm'))).toBe(false);

    warnSpy.mockRestore();
  });

  it('should handle error when removing javascript fails', async () => {
    const { loadPdfDocument } = await import('../js/utils/load-pdf-document');

    const pdfDoc = await PDFDocument.create();

    const originalHas = pdfDoc.catalog.has.bind(pdfDoc.catalog);

    pdfDoc.catalog.has = ((name: PDFName) => {
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

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await sanitizePdf(new Uint8Array([1, 2, 3]), {
      ...defaultOptions,
      removeJavascript: true,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Could not remove JavaScript: Test Error from Javascript removal'
    );

    warnSpy.mockRestore();
  });

  it('should handle error when reading action from link annotation fails', async () => {
    const { loadPdfDocument } = await import('../js/utils/load-pdf-document');
    const pdfDoc = await PDFDocument.create();

    // Add a page
    const page = pdfDoc.addPage();
    const pageDict = page.node;
    const context = pdfDoc.context;

    const actionDict = context.obj({});
    const originalGet = actionDict.get.bind(actionDict);
    actionDict.get = ((name: PDFName) => {
      if (
        name &&
        typeof name.decodeText === 'function' &&
        name.decodeText() === 'S'
      ) {
        throw new Error('Test Error reading action S');
      }
      return originalGet(name);
    }) as typeof actionDict.get;

    const actionRef = context.register(actionDict);

    const annotDict = context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      A: actionRef,
    });
    const annotRef = context.register(annotDict);

    const annotsArray = context.obj([annotRef]);
    pageDict.set(PDFName.of('Annots'), annotsArray);

    vi.mocked(loadPdfDocument).mockResolvedValue(pdfDoc);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await sanitizePdf(new Uint8Array([1, 2, 3]), {
      ...defaultSanitizeOptions,
      removeLinks: true,
      removeMetadata: false,
      removeAnnotations: false,
      removeJavascript: false,
      removeEmbeddedFiles: false,
      removeLayers: false,
      removeStructureTree: false,
      removeMarkInfo: false,
      removeFonts: false,
      flattenForms: false,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      'Could not read action:',
      'Test Error reading action S'
    );

    warnSpy.mockRestore();
  });
});
