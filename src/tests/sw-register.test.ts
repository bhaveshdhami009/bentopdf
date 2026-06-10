import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { collectTrustedWasmHosts } from '../js/sw-register';

describe('sw-register', () => {
  describe('collectTrustedWasmHosts', () => {
    const originalConsoleWarn = console.warn;
    let warnSpy: any;

    beforeEach(() => {
      warnSpy = vi.fn();
      console.warn = warnSpy;
      vi.stubEnv('VITE_WASM_PYMUPDF_URL', 'https://example.com/pymupdf.wasm');
      vi.stubEnv('VITE_WASM_GS_URL', 'https://gs.example.com/gs.wasm');
      vi.stubEnv('VITE_WASM_CPDF_URL', 'invalid-url');
      vi.stubEnv('VITE_TESSERACT_WORKER_URL', '');
      vi.stubEnv('VITE_TESSERACT_CORE_URL', 'https://example.com/core');
      vi.stubEnv('VITE_TESSERACT_LANG_URL', undefined);
      vi.stubEnv('VITE_OCR_FONT_BASE_URL', 'http://fonts.com/base');
    });

    afterEach(() => {
      console.warn = originalConsoleWarn;
      vi.unstubAllEnvs();
    });

    it('should collect origins from valid URLs and ignore empty/undefined', () => {
      const hosts = collectTrustedWasmHosts();
      expect(hosts).toContain('https://example.com');
      expect(hosts).toContain('https://gs.example.com');
      expect(hosts).toContain('http://fonts.com');
      expect(hosts.length).toBe(3);
    });

    it('should catch malformed URLs and warn without throwing', () => {
      const hosts = collectTrustedWasmHosts();
      // "invalid-url" is malformed and should be caught
      expect(warnSpy).toHaveBeenCalledWith(
        `[SW] Ignoring malformed VITE_* URL for SW trusted-hosts: invalid-url`
      );
      expect(hosts).not.toContain('invalid-url');
    });
  });
});
