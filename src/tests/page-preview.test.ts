import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
}));

describe('page-preview', () => {
  let mockPdfDoc: PDFDocumentProxy;
  let mockPage: PDFPageProxy;

  beforeEach(async () => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as any;

    mockPage = {
      getViewport: vi.fn().mockReturnValue({ width: 800, height: 600 }),
      render: vi.fn().mockReturnValue({
        promise: Promise.resolve(),
      } as RenderTask),
    } as unknown as PDFPageProxy;

    mockPdfDoc = {
      numPages: 5,
      getPage: vi.fn().mockResolvedValue(mockPage),
    } as unknown as PDFDocumentProxy;

    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const waitForRender = async () => {
    await vi.waitFor(() => {
      const container = document.getElementById('preview-canvas-container');
      expect(container?.querySelector('canvas')).toBeTruthy();
    });
  };

  describe('showPreview & hidePreview', () => {
    it('creates modal and renders page on showPreview', async () => {
      const { showPreview } = await import('../js/utils/page-preview');

      showPreview(mockPdfDoc, 1, 5);

      const modal = document.getElementById('page-preview-modal');
      expect(modal).toBeTruthy();
      expect(document.body.style.overflow).toBe('hidden');

      await vi.waitFor(() => {
        expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1);
        expect(mockPage.render).toHaveBeenCalled();
      });

      await waitForRender();

      const pageInfo = document.getElementById('preview-page-info');
      expect(pageInfo?.textContent).toBe('Page 1 of 5');
    });

    it('hides modal and restores overflow on hidePreview', async () => {
      const { showPreview, hidePreview } =
        await import('../js/utils/page-preview');
      showPreview(mockPdfDoc, 1, 5);

      const modal = document.getElementById('page-preview-modal')!;
      hidePreview();

      expect(modal.classList.contains('opacity-0')).toBe(true);
      expect(document.body.style.overflow).toBe('');

      vi.resetModules();
      const { hidePreview: hidePreviewEarly } =
        await import('../js/utils/page-preview');
      expect(() => hidePreviewEarly()).not.toThrow();
    });

    it('handles rendering error gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockPdfDoc.getPage = vi
        .fn()
        .mockRejectedValue(new Error('Simulated error'));

      const { showPreview, hidePreview } =
        await import('../js/utils/page-preview');
      showPreview(mockPdfDoc, 1, 5);

      await vi.waitFor(() => {
        const container = document.getElementById('preview-canvas-container');
        expect(container?.innerHTML).toContain('Failed to render page');
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      hidePreview();
    });
  });

  describe('navigation', () => {
    it('navigates next and previous using buttons', async () => {
      const { showPreview, hidePreview } =
        await import('../js/utils/page-preview');
      showPreview(mockPdfDoc, 2, 5);
      await waitForRender();

      (mockPdfDoc.getPage as any).mockClear();

      const nextBtn = document.getElementById('preview-next')!;
      nextBtn.click();
      await waitForRender();

      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(3);

      (mockPdfDoc.getPage as any).mockClear();

      const prevBtn = document.getElementById('preview-prev')!;
      prevBtn.click();
      await waitForRender();

      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(2);

      (mockPdfDoc.getPage as any).mockClear();
      prevBtn.click();
      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1);

      (mockPdfDoc.getPage as any).mockClear();
      prevBtn.click();
      expect(mockPdfDoc.getPage).not.toHaveBeenCalled();

      hidePreview();
    });

    it('navigates using keyboard', async () => {
      const { showPreview, hidePreview } =
        await import('../js/utils/page-preview');
      showPreview(mockPdfDoc, 2, 5);
      await waitForRender();

      (mockPdfDoc.getPage as any).mockClear();

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight' })
      );
      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(3);

      (mockPdfDoc.getPage as any).mockClear();

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      );
      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(2);

      (mockPdfDoc.getPage as any).mockClear();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
      expect(mockPdfDoc.getPage).not.toHaveBeenCalled();

      hidePreview();
    });

    it('does nothing on keydown if not open', async () => {
      const { hidePreview } = await import('../js/utils/page-preview');
      hidePreview();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    it('closes modal on Escape key', async () => {
      const { showPreview, hidePreview } =
        await import('../js/utils/page-preview');
      showPreview(mockPdfDoc, 2, 5);

      const modal = document.getElementById('page-preview-modal')!;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(modal.classList.contains('opacity-0')).toBe(true);
      hidePreview();
    });

    it('closes modal on overlay click', async () => {
      const { showPreview, hidePreview } =
        await import('../js/utils/page-preview');
      showPreview(mockPdfDoc, 1, 5);

      const modal = document.getElementById('page-preview-modal')!;
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: modal,
        enumerable: true,
      });
      modal.dispatchEvent(event);

      expect(modal.classList.contains('opacity-0')).toBe(true);
      hidePreview();
    });
  });

  describe('initPagePreview', () => {
    it('adds preview buttons to thumbnails and binds click', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-page-number="2" class="thumb group relative"></div>
        <div data-page-index="2" class="thumb"></div>
      `;
      const noAttrThumb = document.createElement('div');
      noAttrThumb.className = 'thumb';
      noAttrThumb.setAttribute('data-pageIndex', 'true');
      container.appendChild(noAttrThumb);

      document.body.appendChild(container);

      const { initPagePreview, hidePreview } =
        await import('../js/utils/page-preview');
      initPagePreview(container, mockPdfDoc);

      const thumbs = container.querySelectorAll('.thumb');
      expect(thumbs[0].querySelector('.page-preview-btn')).toBeTruthy();
      expect(thumbs[1].querySelector('.page-preview-btn')).toBeTruthy();
      expect(thumbs[2].querySelector('.page-preview-btn')).toBeTruthy();

      const btn1 = thumbs[0].querySelector('.page-preview-btn') as HTMLElement;
      btn1.click();
      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(2);
      hidePreview();

      const btn2 = thumbs[1].querySelector('.page-preview-btn') as HTMLElement;
      btn2.click();
      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(3);
      hidePreview();

      const btn3 = thumbs[2].querySelector('.page-preview-btn') as HTMLElement;
      btn3.click();
      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1);
      hidePreview();

      initPagePreview(container, mockPdfDoc);
      expect(thumbs[0].querySelectorAll('.page-preview-btn').length).toBe(1);
    });

    it('handles spacebar keydown on hovered thumbnail with data-page-number', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-page-number="3" class="thumb" data-preview-init="true"></div>
      `;
      document.body.appendChild(container);

      const thumb = container.querySelector('.thumb') as HTMLElement;

      container.querySelector = vi.fn().mockImplementation((sel) => {
        if (sel === '[data-preview-init]:hover') return thumb;
        return Element.prototype.querySelector.call(container, sel);
      });

      const { initPagePreview, hidePreview } =
        await import('../js/utils/page-preview');
      initPagePreview(container, mockPdfDoc);

      const event = new KeyboardEvent('keydown', { key: ' ' });
      container.dispatchEvent(event);

      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(3);
      hidePreview();
    });

    it('handles spacebar keydown on hovered thumbnail with data-page-index', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-page-index="3" class="thumb" data-preview-init="true"></div>
      `;
      document.body.appendChild(container);

      const thumb = container.querySelector('.thumb') as HTMLElement;

      container.querySelector = vi.fn().mockImplementation((sel) => {
        if (sel === '[data-preview-init]:hover') return thumb;
        return Element.prototype.querySelector.call(container, sel);
      });

      const { initPagePreview, hidePreview } =
        await import('../js/utils/page-preview');
      initPagePreview(container, mockPdfDoc);

      const event = new KeyboardEvent('keydown', { key: ' ' });
      container.dispatchEvent(event);

      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(4);
      hidePreview();
    });

    it('handles spacebar keydown on hovered thumbnail without page indicators', async () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="thumb" data-preview-init="true"></div>
      `;
      document.body.appendChild(container);

      const thumb = container.querySelector('.thumb') as HTMLElement;

      container.querySelector = vi.fn().mockImplementation((sel) => {
        if (sel === '[data-preview-init]:hover') return thumb;
        return Element.prototype.querySelector.call(container, sel);
      });

      const { initPagePreview, hidePreview } =
        await import('../js/utils/page-preview');
      initPagePreview(container, mockPdfDoc);

      const event = new KeyboardEvent('keydown', { key: ' ' });
      container.dispatchEvent(event);

      await waitForRender();
      expect(mockPdfDoc.getPage).toHaveBeenCalledWith(1);
      hidePreview();
    });
  });

  describe('coverage edge cases', () => {
    it('returns early from renderPreviewPage if pdfjsDoc is null', async () => {
      const { showPreview } = await import('../js/utils/page-preview');
      showPreview(null as any, 1, 5);

      const container = document.getElementById('preview-canvas-container');
      expect(container).toBeTruthy();
      expect(mockPdfDoc.getPage).not.toHaveBeenCalled();
    });

    it('does nothing on spacebar if no thumbnail is hovered', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const { initPagePreview } = await import('../js/utils/page-preview');
      initPagePreview(container, mockPdfDoc);

      const event = new KeyboardEvent('keydown', { key: ' ' });
      container.dispatchEvent(event);
      expect(mockPdfDoc.getPage).not.toHaveBeenCalled();
    });

    it('does nothing on spacebar if preview is already open', async () => {
      const container = document.createElement('div');
      container.innerHTML = `<div data-page-number="3" class="thumb" data-preview-init="true"></div>`;
      document.body.appendChild(container);

      const thumb = container.querySelector('.thumb') as HTMLElement;
      container.querySelector = vi.fn().mockImplementation((sel) => {
        if (sel === '[data-preview-init]:hover') return thumb;
        return Element.prototype.querySelector.call(container, sel);
      });

      const { initPagePreview, showPreview } =
        await import('../js/utils/page-preview');
      initPagePreview(container, mockPdfDoc);
      showPreview(mockPdfDoc, 1, 5);

      (mockPdfDoc.getPage as any).mockClear();

      const event = new KeyboardEvent('keydown', { key: ' ' });
      container.dispatchEvent(event);
      expect(mockPdfDoc.getPage).not.toHaveBeenCalled();
    });
  });
});
