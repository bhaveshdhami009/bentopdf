import { describe, it, expect } from 'vitest';
import { tiffIfdToRgba } from '../js/utils/tiff-utils';

describe('tiffIfdToRgba', () => {
  it('should convert 8-bit RGB to RGBA', () => {
    // 2x2 image, RGB (3 channels), 8-bit (Uint8Array)
    const src = new Uint8Array([
      255,
      0,
      0, // Red
      0,
      255,
      0, // Green
      0,
      0,
      255, // Blue
      255,
      255,
      255, // White
    ]);
    const dst = tiffIfdToRgba(src, 2, 2, 3, 1); // photometricType 1 = black is zero

    expect(dst).toEqual(
      new Uint8ClampedArray([
        255,
        0,
        0,
        255, // Red with full alpha
        0,
        255,
        0,
        255, // Green with full alpha
        0,
        0,
        255,
        255, // Blue with full alpha
        255,
        255,
        255,
        255, // White with full alpha
      ])
    );
  });

  it('should convert 8-bit RGBA to RGBA', () => {
    // 2x1 image, RGBA (4 channels), 8-bit (Uint8Array)
    const src = new Uint8Array([
      255,
      0,
      0,
      128, // Red, 50% opacity
      0,
      255,
      0,
      64, // Green, 25% opacity
    ]);
    const dst = tiffIfdToRgba(src, 2, 1, 4, 1);

    expect(dst).toEqual(new Uint8ClampedArray([255, 0, 0, 128, 0, 255, 0, 64]));
  });

  it('should convert 16-bit RGB to RGBA', () => {
    // 1x2 image, RGB (3 channels), 16-bit (Uint16Array)
    const src = new Uint16Array([
      65535,
      0,
      0, // Full Red
      0,
      32768,
      65535, // Half Green, Full Blue
    ]);
    const dst = tiffIfdToRgba(src, 1, 2, 3, 1);

    // 65535 >> 8 = 255
    // 32768 >> 8 = 128
    // 0 >> 8 = 0
    expect(dst).toEqual(
      new Uint8ClampedArray([255, 0, 0, 255, 0, 128, 255, 255])
    );
  });

  it('should convert Float32 RGB to RGBA', () => {
    // 1x2 image, RGB (3 channels), Float32Array
    const src = new Float32Array([
      1.0,
      0.0,
      0.0, // Full Red
      0.0,
      0.5,
      1.0, // Half Green, Full Blue
    ]);
    const dst = tiffIfdToRgba(src, 1, 2, 3, 1);

    expect(dst).toEqual(
      new Uint8ClampedArray([
        255,
        0,
        0,
        255,
        0,
        Math.round(0.5 * 255),
        255,
        255,
      ])
    );
  });

  it('should convert Float64 RGB to RGBA', () => {
    // 1x1 image, RGB (3 channels), Float64Array
    const src = new Float64Array([
      0.25,
      0.75,
      1.0, // 25% Red, 75% Green, Full Blue
    ]);
    const dst = tiffIfdToRgba(src, 1, 1, 3, 1);

    expect(dst).toEqual(
      new Uint8ClampedArray([
        Math.round(0.25 * 255),
        Math.round(0.75 * 255),
        255,
        255,
      ])
    );
  });

  it('should handle Float out of bounds values', () => {
    // 1x1 image, RGB, Float32Array
    const src = new Float32Array([
      1.5,
      -0.5,
      2.0, // Values outside 0..1
    ]);
    const dst = tiffIfdToRgba(src, 1, 1, 3, 1);

    // min(1, max(0, v)) will clamp them to 1, 0, 1
    expect(dst).toEqual(new Uint8ClampedArray([255, 0, 255, 255]));
  });

  it('should convert 8-bit Grayscale (Black is zero) to RGBA', () => {
    // 2x1 image, Grayscale (1 channel), 8-bit
    const src = new Uint8Array([
      0, // Black
      255, // White
    ]);
    const dst = tiffIfdToRgba(src, 2, 1, 1, 1); // photometricType 1 = black is zero

    expect(dst).toEqual(
      new Uint8ClampedArray([
        0,
        0,
        0,
        255, // Black
        255,
        255,
        255,
        255, // White
      ])
    );
  });

  it('should convert 8-bit Grayscale (White is zero) to RGBA', () => {
    // 2x1 image, Grayscale (1 channel), 8-bit
    const src = new Uint8Array([
      0, // White
      255, // Black
    ]);
    const dst = tiffIfdToRgba(src, 2, 1, 1, 0); // photometricType 0 = white is zero

    expect(dst).toEqual(
      new Uint8ClampedArray([
        255,
        255,
        255,
        255, // White
        0,
        0,
        0,
        255, // Black
      ])
    );
  });

  it('should convert 8-bit Grayscale + Alpha to RGBA', () => {
    // 2x1 image, Grayscale + Alpha (2 channels), 8-bit
    const src = new Uint8Array([
      0,
      255, // Black, fully opaque
      255,
      128, // White, 50% opacity
    ]);
    const dst = tiffIfdToRgba(src, 2, 1, 2, 1); // photometricType 1 = black is zero

    expect(dst).toEqual(
      new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 128])
    );
  });
});
