import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as ui from '../js/ui';

// Mock dependencies
vi.mock('../js/utils/render-utils.js', () => ({
  renderPagesProgressively: vi.fn(),
  cleanupLazyRendering: vi.fn(),
}));

vi.mock('../js/utils/page-preview.js', () => ({
  initPagePreview: vi.fn(),
}));

vi.mock('lucide', () => ({
  createIcons: vi.fn(),
  icons: {},
}));

vi.mock('../js/i18n/i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('../js/utils/helpers.js', () => ({
  getPDFDocument: vi.fn(),
  formatBytes: vi.fn(),
}));

describe('ui', () => {
  describe('renderPageThumbnails error boundary', () => {
    let consoleErrorSpy: any;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Set up DOM
      document.body.innerHTML = `
        <div id="page-rotator"></div>
        <div id="loader-modal">
           <div id="loader-text"></div>
           <div class="loader-progress-bar"></div>
           <div class="loader-progress-text"></div>
        </div>
        <div id="alert-modal" class="hidden"></div>
        <div id="alert-title"></div>
        <div id="alert-message"></div>
        <button id="alert-ok"></button>
      `;

      ui.dom.loaderModal = document.getElementById('loader-modal');
      ui.dom.loaderText = document.getElementById('loader-text');
      ui.dom.alertModal = document.getElementById('alert-modal');
      ui.dom.alertTitle = document.getElementById('alert-title');
      ui.dom.alertMessage = document.getElementById('alert-message');
      ui.dom.alertOkBtn = document.getElementById('alert-ok');
    });

    afterEach(() => {
      vi.restoreAllMocks();
      document.body.innerHTML = '';
    });

    it('should catch errors and call showAlert when rendering fails', async () => {
      // Setup mock to force an error
      const { renderPagesProgressively } =
        await import('../js/utils/render-utils.js');
      (renderPagesProgressively as any).mockRejectedValue(
        new Error('Mocked rendering error')
      );

      const mockPdfDoc = {
        save: vi.fn().mockResolvedValue(new Uint8Array()),
      };

      const { getPDFDocument } = await import('../js/utils/helpers.js');
      (getPDFDocument as any).mockReturnValue({ promise: Promise.resolve({}) });

      await ui.renderPageThumbnails('rotate', mockPdfDoc as any);

      // Verify error was caught and logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error rendering page thumbnails:',
        expect.any(Error)
      );

      // Verify showAlert was called by checking if alert modal became visible
      expect(ui.dom.alertModal?.classList.contains('hidden')).toBe(false);
      expect(ui.dom.alertTitle?.textContent).toBe('multiTool.error');
      expect(ui.dom.alertMessage?.textContent).toBe('multiTool.errorRendering');

      // Verify loader was hidden in finally block
      expect(ui.dom.loaderModal?.classList.contains('hidden')).toBe(true);
    });
  });
});
