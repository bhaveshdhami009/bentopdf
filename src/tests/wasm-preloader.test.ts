import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as wasmCdnConfig from '../js/config/wasm-cdn-config';
import * as ghostscriptLoader from '../js/utils/ghostscript-loader';

vi.mock('../js/config/wasm-cdn-config', () => ({
  isWasmAvailable: vi.fn(),
  getWasmBaseUrl: vi.fn(),
}));

vi.mock('../js/utils/ghostscript-loader', () => ({
  loadGsModule: vi.fn(),
  setCachedGsModule: vi.fn(),
}));

describe('wasm-preloader', () => {
  let requestIdleCallbackSpy: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    requestIdleCallbackSpy = vi.fn((cb) => cb());
    vi.stubGlobal('requestIdleCallback', requestIdleCallbackSpy);

    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initial state should be IDLE', async () => {
    const { getPreloadStatus, PreloadStatus } = await import('../js/utils/wasm-preloader');
    const status = getPreloadStatus();
    expect(status.pymupdf).toBe(PreloadStatus.IDLE);
    expect(status.ghostscript).toBe(PreloadStatus.IDLE);
    expect(status.libreoffice).toBe(PreloadStatus.IDLE);
  });

  it('skips preload on LibreOffice pages', async () => {
    window.location.pathname = '/word-to-pdf';
    const { startBackgroundPreload, getPreloadStatus, PreloadStatus } = await import('../js/utils/wasm-preloader');

    startBackgroundPreload();

    const status = getPreloadStatus();
    expect(status.pymupdf).toBe(PreloadStatus.IDLE);
    expect(status.ghostscript).toBe(PreloadStatus.IDLE);
    expect(requestIdleCallbackSpy).not.toHaveBeenCalled();
  });

  it('sets state to UNAVAILABLE if WASM is not configured', async () => {
    vi.mocked(wasmCdnConfig.isWasmAvailable).mockReturnValue(false);
    const { startBackgroundPreload, getPreloadStatus, PreloadStatus } = await import('../js/utils/wasm-preloader');

    startBackgroundPreload();
    await new Promise(process.nextTick);

    const status = getPreloadStatus();
    expect(status.pymupdf).toBe(PreloadStatus.UNAVAILABLE);
    expect(status.ghostscript).toBe(PreloadStatus.UNAVAILABLE);
  });

  it('sets state to ERROR if preload fails', async () => {
    vi.mocked(wasmCdnConfig.isWasmAvailable).mockReturnValue(true);
    vi.mocked(wasmCdnConfig.getWasmBaseUrl).mockReturnValue('/invalid-path/');
    vi.mocked(ghostscriptLoader.loadGsModule).mockRejectedValue(new Error('Failed GS'));

    const { startBackgroundPreload, getPreloadStatus, PreloadStatus } = await import('../js/utils/wasm-preloader');

    startBackgroundPreload();

    // wait enough for async tasks (PyMuPDF fetch and Ghostscript load)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const status = getPreloadStatus();
    expect(status.pymupdf).toBe(PreloadStatus.ERROR);
    expect(status.ghostscript).toBe(PreloadStatus.ERROR);
  });

  it('sets state to READY if preload succeeds (for ghostscript)', async () => {
    vi.mocked(wasmCdnConfig.isWasmAvailable).mockReturnValue(true);

    vi.mocked(wasmCdnConfig.getWasmBaseUrl).mockReturnValue('/invalid-path/'); // we will ignore pymupdf failure

    // Mock the ghostscript loader success
    const mockGsModule = { FS: {}, callMain: vi.fn() };
    vi.mocked(ghostscriptLoader.loadGsModule).mockResolvedValue(mockGsModule as any);

    const { startBackgroundPreload, getPreloadStatus, PreloadStatus } = await import('../js/utils/wasm-preloader');

    startBackgroundPreload();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const status = getPreloadStatus();
    expect(status.ghostscript).toBe(PreloadStatus.READY);
    expect(ghostscriptLoader.setCachedGsModule).toHaveBeenCalledWith(mockGsModule);
  });
});
