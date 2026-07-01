import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { viewMetadataTool } from '../js/handlers/tools/viewMetadataTool.js';
import { state } from '../js/state.js';
import * as helpers from '../js/utils/helpers.js';

vi.mock('../js/utils/helpers.js', () => ({
  readFileAsArrayBuffer: vi.fn(),
  getPDFDocument: vi.fn(),
  formatIsoDate: vi.fn(),
}));

vi.mock('../js/ui.js', () => ({
  showAlert: vi.fn(),
  hideLoader: vi.fn(),
  showLoader: vi.fn(),
}));

describe('viewMetadataTool', () => {
  let mockGetMetadata: any;
  let mockGetFieldObjects: any;

  beforeEach(() => {
    document.body.innerHTML = '<div id="metadata-results"></div>';
    state.files = [
      new File(['dummy content'], 'test.pdf', { type: 'application/pdf' }),
    ];

    mockGetMetadata = vi.fn().mockResolvedValue({
      info: {},
      metadata: {
        getRaw: () => '<rdf:RDF>Malformed XML</rdf:RDF>',
      },
    });

    mockGetFieldObjects = vi.fn().mockResolvedValue({});

    (helpers.getPDFDocument as any).mockReturnValue({
      promise: Promise.resolve({
        getMetadata: mockGetMetadata,
        getFieldObjects: mockGetFieldObjects,
      }),
    });

    (helpers.readFileAsArrayBuffer as any).mockResolvedValue(
      new ArrayBuffer(8)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle XML parsing error in XMP metadata and display raw XML', async () => {
    const originalDOMParser = window.DOMParser;
    const mockDOMParser = vi.fn().mockImplementation(function () {
      return {
        parseFromString: vi.fn().mockImplementation(function () {
          throw new Error('Test XML parse error');
        }),
      };
    });
    window.DOMParser = mockDOMParser;

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(function () {});

    await viewMetadataTool();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to parse XMP XML:',
      expect.any(Error)
    );

    const resultsDiv = document.getElementById('metadata-results');
    expect(resultsDiv?.innerHTML).toContain(
      'Error parsing XMP XML. Displaying raw.'
    );

    const preTag = resultsDiv?.querySelector('pre');
    expect(preTag).not.toBeNull();
    expect(preTag?.textContent).toBe('<rdf:RDF>Malformed XML</rdf:RDF>');

    window.DOMParser = originalDOMParser;
  });
});
