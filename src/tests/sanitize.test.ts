import { describe, expect, it, vi, beforeEach } from 'vitest';
import { sanitizePdf, SanitizeOptions } from '../js/utils/sanitize';
import { PDFDocument, PDFName } from 'pdf-lib';

vi.mock('../js/utils/load-pdf-document', () => ({
  loadPdfDocument: vi.fn(async () => {
    const doc = await PDFDocument.create();

    // Making doc.catalog.has throw when called with OpenAction does exactly what we want,
    // which is testing the `catch` block wrapping `removeJavascriptFromDoc`.
    const originalHas = doc.catalog.has.bind(doc.catalog);
    doc.catalog.has = (name) => {
      if (name === PDFName.of('OpenAction')) {
        throw new Error('Test Error from Javascript removal');
      }
      return originalHas(name);
    };

    return doc;
  })
}));

describe('sanitizePdf', () => {
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

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle error when removing javascript fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const bytes = new Uint8Array([1, 2, 3]);
    await sanitizePdf(bytes, { ...defaultOptions, removeJavascript: true });

    expect(warnSpy).toHaveBeenCalledWith('Could not remove JavaScript: Test Error from Javascript removal');
  });
});
