import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupCanvasEditor } from '../js/canvasEditor';
import * as ui from '../js/ui';
import { state } from '../js/state';
import * as helpers from '../js/utils/helpers';

vi.mock('../js/ui', () => ({
  showLoader: vi.fn(),
  hideLoader: vi.fn(),
  showAlert: vi.fn(),
}));

vi.mock('../js/state', () => ({
  state: {
    pdfDoc: {
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    },
  },
}));

vi.mock('lucide', () => ({
  icons: {},
  createIcons: vi.fn(),
}));

describe('canvasEditor Error Handling', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <canvas id="canvas-editor"></canvas>
      <div id="canvas-container"></div>
      <div id="page-nav"></div>
      <button id="zoom-in-btn"></button>
      <button id="zoom-out-btn"></button>
      <button id="fit-page-btn"></button>
      <button id="clear-crop-btn"></button>
      <button id="clear-all-crops-btn"></button>
      <button id="process-btn"></button>
    `;

    // Mock getContext directly on HTMLCanvasElement prototype
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      getImageData: vi.fn().mockReturnValue({}),
      putImageData: vi.fn(),
      setLineDash: vi.fn(),
      strokeRect: vi.fn(),
    }) as any;

    vi.clearAllMocks();

    // Mock getPDFDocument
    vi.spyOn(helpers, 'getPDFDocument').mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
          render: vi.fn().mockReturnValue({
            promise: Promise.reject(new Error('Mocked render error')),
          }),
        }),
      }),
    } as any);

    // Mock console.error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle rendering errors gracefully and call showAlert', async () => {
    await setupCanvasEditor('crop');

    // Wait for the renderPage queue to flush
    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Error rendering page:', expect.any(Error));
      expect(ui.showAlert).toHaveBeenCalledWith('Render Error', 'Could not display the page.');
    }, { timeout: 1000 });
  });
});
