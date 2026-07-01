import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { renderVisualDiff } from '../../../js/compare/engine/visual-diff';
import pixelmatch from 'pixelmatch';
import { VISUAL_DIFF as VISUAL_DIFF_CONFIG } from '../../../js/compare/config';

vi.mock('pixelmatch', () => ({
  default: vi.fn(() => 0),
}));

describe('renderVisualDiff', () => {
  let mockContext: any;
  let originalGetContext: any;
  let canvas1: HTMLCanvasElement;
  let canvas2: HTMLCanvasElement;
  let outputCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockContext = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(100 * 100 * 4),
      })),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(100 * 100 * 4),
      })),
      putImageData: vi.fn(),
      fillStyle: '',
      globalAlpha: 1,
    };

    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);

    canvas1 = document.createElement('canvas');
    canvas1.width = 100;
    canvas1.height = 100;

    canvas2 = document.createElement('canvas');
    canvas2.width = 100;
    canvas2.height = 100;

    outputCanvas = document.createElement('canvas');
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.clearAllMocks();
  });

  it('computes visual diff for two identical canvases', () => {
    (pixelmatch as unknown as Mock).mockReturnValue(0);

    const result = renderVisualDiff(canvas1, canvas2, outputCanvas);

    expect(result).toEqual({
      mismatchPixels: 0,
      mismatchRatio: 0,
      hasDiff: false,
    });

    expect(pixelmatch).toHaveBeenCalled();
    expect(outputCanvas.width).toBe(100);
    expect(outputCanvas.height).toBe(100);
    expect(mockContext.drawImage).toHaveBeenCalled();
  });

  it('computes visual diff with mismatches', () => {
    (pixelmatch as unknown as Mock).mockReturnValue(500);

    const result = renderVisualDiff(canvas1, canvas2, outputCanvas);

    expect(result).toEqual({
      mismatchPixels: 500,
      mismatchRatio: 500 / (100 * 100),
      hasDiff: true,
    });

    expect(pixelmatch).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      expect.any(Uint8ClampedArray),
      expect.any(Uint8ClampedArray),
      100,
      100,
      expect.objectContaining({
        threshold: VISUAL_DIFF_CONFIG.PIXELMATCH_THRESHOLD,
        includeAA: false,
        alpha: VISUAL_DIFF_CONFIG.ALPHA,
        diffMask: false,
      })
    );
  });

  it('handles focus region correctly', () => {
    (pixelmatch as unknown as Mock).mockReturnValue(100);
    const focusRegion = { x: 10, y: 10, width: 50, height: 50 };

    const result = renderVisualDiff(
      canvas1,
      canvas2,
      outputCanvas,
      focusRegion
    );

    expect(result).toEqual({
      mismatchPixels: 100,
      mismatchRatio: 100 / (100 * 100), // overall mismatch ratio based on canvas size
      hasDiff: true,
    });

    expect(outputCanvas.width).toBe(50);
    expect(outputCanvas.height).toBe(50);
  });

  it('handles different sized canvases by maxing dimensions', () => {
    canvas1.width = 150;
    canvas1.height = 120;
    canvas2.width = 100;
    canvas2.height = 200;

    // Create image data for larger dimensions
    mockContext.getImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(150 * 200 * 4),
    }));
    mockContext.createImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(150 * 200 * 4),
    }));

    (pixelmatch as unknown as Mock).mockReturnValue(0);

    renderVisualDiff(canvas1, canvas2, outputCanvas);

    expect(outputCanvas.width).toBe(150);
    expect(outputCanvas.height).toBe(200);

    expect(pixelmatch).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      expect.any(Uint8ClampedArray),
      expect.any(Uint8ClampedArray),
      150,
      200,
      expect.any(Object)
    );
  });

  it('throws an error if getContext returns null during normalization', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

    expect(() => renderVisualDiff(canvas1, canvas2, outputCanvas)).toThrow(
      'Could not create comparison canvas context.'
    );
  });

  it('throws an error if getContext returns null for visual diff context', () => {
    // Only fail for the visual diff context part, we need to bypass normalization
    let callCount = 0;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => {
      callCount++;
      // Return a valid context for the first two calls (normalization)
      // Then return null for the visual diff part (context1, context2, outputContext)
      if (callCount <= 2) {
        return mockContext;
      }
      return null;
    });

    expect(() => renderVisualDiff(canvas1, canvas2, outputCanvas)).toThrow(
      'Could not create visual diff context.'
    );
  });

  it('throws an error if getContext returns null for overlay context', () => {
    let callCount = 0;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => {
      callCount++;
      // Normalization (2), then context1, context2, outputContext (3)
      if (callCount <= 5) {
        return mockContext;
      }
      // Fail on overlayCanvas context (call 6)
      return null;
    });

    expect(() => renderVisualDiff(canvas1, canvas2, outputCanvas)).toThrow(
      'Could not create visual diff overlay context.'
    );
  });
});
