import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WindowWithCoherentPdf, CpdfInstance } from '@/types';

vi.mock('../js/utils/wasm-provider', () => ({
  WasmProvider: {
    isConfigured: vi.fn(),
    getUrl: vi.fn(),
  },
}));

describe('cpdf-helper', () => {
  let WasmProviderMock: any;

  beforeEach(async () => {
    vi.resetModules();
    document.head.innerHTML = '';
    delete (window as any).coherentpdf;

    const { WasmProvider } = await import('../js/utils/wasm-provider');
    WasmProviderMock = WasmProvider;
    WasmProviderMock.isConfigured.mockReset();
    WasmProviderMock.getUrl.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('isCpdfAvailable should return true if configured', async () => {
    const { isCpdfAvailable } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.isConfigured.mockReturnValue(true);
    expect(isCpdfAvailable()).toBe(true);
    expect(WasmProviderMock.isConfigured).toHaveBeenCalledWith('cpdf');
  });

  it('isCpdfAvailable should return false if not configured', async () => {
    const { isCpdfAvailable } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.isConfigured.mockReturnValue(false);
    expect(isCpdfAvailable()).toBe(false);
  });

  it('isCpdfLoaded should throw if not configured', async () => {
    const { isCpdfLoaded } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.getUrl.mockReturnValue(undefined);
    await expect(isCpdfLoaded()).rejects.toThrow(
      'CoherentPDF is not configured. Please configure it in WASM Settings.'
    );
  });

  it('isCpdfLoaded should resolve immediately if window.coherentpdf exists', async () => {
    const { isCpdfLoaded } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.getUrl.mockReturnValue('https://example.com/cpdf');
    (window as any).coherentpdf = {};

    await isCpdfLoaded();
    expect(document.head.innerHTML).toBe('');
  });

  it('isCpdfLoaded should create script and resolve on load', async () => {
    const { isCpdfLoaded } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.getUrl.mockReturnValue('https://example.com/cpdf/');

    const loadPromise = isCpdfLoaded();

    const script = document.head.querySelector('script');
    expect(script).not.toBeNull();
    expect(script?.src).toBe(
      'https://example.com/cpdf/coherentpdf.browser.min.js'
    );

    if (script && script.onload) {
      (script.onload as any)();
    }

    await expect(loadPromise).resolves.toBeUndefined();
  });

  it('isCpdfLoaded should append trailing slash to URL if missing', async () => {
    const { isCpdfLoaded } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.getUrl.mockReturnValue(
      'https://example.com/cpdf-no-slash'
    );

    const loadPromise = isCpdfLoaded();

    const script = document.head.querySelector('script');
    expect(script?.src).toBe(
      'https://example.com/cpdf-no-slash/coherentpdf.browser.min.js'
    );

    if (script && script.onload) {
      (script.onload as any)();
    }

    await expect(loadPromise).resolves.toBeUndefined();
  });

  it('isCpdfLoaded should reject if script loading fails', async () => {
    const { isCpdfLoaded } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.getUrl.mockReturnValue('https://example.com/cpdf');

    const loadPromise = isCpdfLoaded();

    const script = document.head.querySelector('script');
    if (script && script.onerror) {
      (script.onerror as any)(new Event('error'));
    }

    await expect(loadPromise).rejects.toThrow(
      'Failed to load CoherentPDF library from: https://example.com/cpdf/coherentpdf.browser.min.js'
    );
  });

  it('isCpdfLoaded should return existing promise if already loading', async () => {
    const { isCpdfLoaded } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.getUrl.mockReturnValue('https://example.com/cpdf');

    const loadPromise1 = isCpdfLoaded();
    const loadPromise2 = isCpdfLoaded();

    // We expect the script to be added only once
    const scripts = document.head.querySelectorAll('script');
    expect(scripts.length).toBe(1);

    if (scripts[0] && scripts[0].onload) {
      (scripts[0].onload as any)();
    }

    await Promise.all([loadPromise1, loadPromise2]);
  });

  it('isCpdfLoaded should resolve immediately if already loaded', async () => {
    const { isCpdfLoaded } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.getUrl.mockReturnValue('https://example.com/cpdf');

    const loadPromise1 = isCpdfLoaded();
    const script = document.head.querySelector('script');
    if (script && script.onload) {
      (script.onload as any)();
    }
    await loadPromise1;

    const loadPromise2 = isCpdfLoaded();
    await loadPromise2;

    const scripts = document.head.querySelectorAll('script');
    expect(scripts.length).toBe(1);
  });

  it('getCpdf should return window.coherentpdf after loading', async () => {
    const { getCpdf } = await import('../js/utils/cpdf-helper');
    WasmProviderMock.getUrl.mockReturnValue('https://example.com/cpdf');

    const mockCpdfInstance = { version: '1.0' };

    const getPromise = getCpdf();

    const script = document.head.querySelector('script');
    if (script && script.onload) {
      (window as any).coherentpdf = mockCpdfInstance;
      (script.onload as any)();
    }

    const result = await getPromise;
    expect(result).toBe(mockCpdfInstance);
  });
});
