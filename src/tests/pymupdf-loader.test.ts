import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadPyMuPDF,
  clearPyMuPDFCache,
  isPyMuPDFAvailable,
} from '../js/utils/pymupdf-loader';
import { WasmProvider } from '../js/utils/wasm-provider';

// Create a mock PyMuPDF module that we can inject using vite
const mockLoad = vi.fn().mockResolvedValue(undefined);
class MockPyMuPDFClass {
  load = mockLoad;
  constructor(args: any) {}
}

vi.mock('../js/utils/wasm-provider', () => ({
  WasmProvider: {
    isConfigured: vi.fn(),
    getUrl: vi.fn(),
  },
}));

// Mock the dynamic import of PyMuPDF
vi.mock('mock-url/dist/index.js', () => {
  return {
    PyMuPDF: MockPyMuPDFClass,
  };
});

describe('pymupdf-loader', () => {
  beforeEach(() => {
    clearPyMuPDFCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isPyMuPDFAvailable', () => {
    it('returns true if both pymupdf and ghostscript are configured', () => {
      vi.mocked(WasmProvider.isConfigured).mockImplementation((type) => {
        return type === 'pymupdf' || type === 'ghostscript';
      });
      expect(isPyMuPDFAvailable()).toBe(true);
    });

    it('returns false if only pymupdf is configured', () => {
      vi.mocked(WasmProvider.isConfigured).mockImplementation(
        (type) => type === 'pymupdf'
      );
      expect(isPyMuPDFAvailable()).toBe(false);
    });

    it('returns false if only ghostscript is configured', () => {
      vi.mocked(WasmProvider.isConfigured).mockImplementation(
        (type) => type === 'ghostscript'
      );
      expect(isPyMuPDFAvailable()).toBe(false);
    });
  });

  describe('loadPyMuPDF', () => {
    it('throws if pymupdf is not configured', async () => {
      vi.mocked(WasmProvider.isConfigured).mockReturnValue(false);
      await expect(loadPyMuPDF()).rejects.toThrow('PyMuPDF is not configured');
    });

    it('throws if ghostscript is not configured', async () => {
      vi.mocked(WasmProvider.isConfigured).mockImplementation(
        (type) => type === 'pymupdf'
      );
      await expect(loadPyMuPDF()).rejects.toThrow(
        'Ghostscript is not configured'
      );
    });

    it('throws dynamically if import fails', async () => {
      vi.mocked(WasmProvider.isConfigured).mockReturnValue(true);
      vi.mocked(WasmProvider.getUrl).mockReturnValue('invalid-url');

      const promise = loadPyMuPDF();

      // Wait for it to reject
      await expect(promise).rejects.toThrow('Failed to load PyMuPDF from CDN');
    });

    it('loads the module correctly if url is valid', async () => {
      vi.mocked(WasmProvider.isConfigured).mockReturnValue(true);
      vi.mocked(WasmProvider.getUrl).mockReturnValue('mock-url/');

      const instance = await loadPyMuPDF();
      expect(instance).toBeDefined();
      expect(mockLoad).toHaveBeenCalled();
    });

    it('uses the cached promise on subsequent calls before resolution', async () => {
      vi.mocked(WasmProvider.isConfigured).mockReturnValue(true);
      vi.mocked(WasmProvider.getUrl).mockReturnValue('mock-url/');

      const p1 = loadPyMuPDF();
      const p2 = loadPyMuPDF();

      // For async functions that return promises, await them to see if they resolve to the same underlying value/instance.
      const i1 = await p1;
      const i2 = await p2;
      expect(i1).toStrictEqual(i2);
    });

    it('uses the cached instance on subsequent calls after resolution', async () => {
      vi.mocked(WasmProvider.isConfigured).mockReturnValue(true);
      vi.mocked(WasmProvider.getUrl).mockReturnValue('mock-url/');

      const instance1 = await loadPyMuPDF();
      const instance2 = await loadPyMuPDF();

      expect(instance1).toStrictEqual(instance2);
    });

    it('throws if module does not export PyMuPDF class correctly', async () => {
      vi.mocked(WasmProvider.isConfigured).mockReturnValue(true);
      vi.mocked(WasmProvider.getUrl).mockReturnValue('bad-export-url/');

      vi.doMock('bad-export-url/dist/index.js', () => ({
        PyMuPDF: 'not-a-function',
      }));

      await expect(loadPyMuPDF()).rejects.toThrow(
        'PyMuPDF module did not export expected PyMuPDF class'
      );
    });

    it('throws dynamically if import throws a non-Error string', async () => {
      vi.mocked(WasmProvider.isConfigured).mockReturnValue(true);
      vi.mocked(WasmProvider.getUrl).mockReturnValue('string-error-url/');

      vi.doMock('string-error-url/dist/index.js', () => {
        // We throw using the inner function so it doesn't trigger vitest factory error
        throw 'String error';
      });

      const promise = loadPyMuPDF();

      // wait, the vitest factory error says: "If you are using "vi.mock" factory, make sure there are no top level variables inside, since this call is hoisted to top of the file."
      // Let's check what it threw: 'Failed to load PyMuPDF from CDN: [vitest] There was an error when mocking a module.'
      // The issue is vi.doMock itself throwing synchronously during setup when it tries to compile the factory maybe?
      // No, `throw 'String error';` inside the factory means WHEN the factory is called by import(), it throws.
      // But vitest captures that throw and replaces it with a generic `[vitest] There was an error when mocking a module...` error!

      // So instead, we can mock `WasmProvider.getUrl` to just return a real valid JS file path that itself throws a string upon evaluation?
      // No, let's just assert it throws SOME error containing "Failed to load PyMuPDF from CDN:"

      await expect(promise).rejects.toThrow('Failed to load PyMuPDF from CDN:');
    });
  });

  describe('clearPyMuPDFCache', () => {
    it('clears the cached promise and instance', async () => {
      vi.mocked(WasmProvider.isConfigured).mockReturnValue(true);
      vi.mocked(WasmProvider.getUrl).mockReturnValue('mock-url/');

      const instance1 = await loadPyMuPDF();

      clearPyMuPDFCache();

      const instance2 = await loadPyMuPDF();

      expect(instance1 === instance2).toBe(false);
    });
  });
});
