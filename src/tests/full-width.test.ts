import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyFullWidthMode, initFullWidthMode } from '../js/utils/full-width';

describe('full-width utils', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="tool-uploader" class="max-w-2xl"></div>
      <div id="signature-editor" class="max-w-4xl"></div>
      <div id="other-element" class="max-w-5xl"></div>
    `;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('applyFullWidthMode', () => {
    it('should remove max-w-* classes when enabled is true', () => {
      applyFullWidthMode(true);

      const uploader = document.getElementById('tool-uploader');
      const signatureEditor = document.getElementById('signature-editor');

      expect(uploader?.classList.contains('max-w-2xl')).toBe(false);
      expect(signatureEditor?.classList.contains('max-w-4xl')).toBe(false);
    });

    it('should add max-w-2xl class when enabled is false and no max-w class is present', () => {
      const uploader = document.getElementById('tool-uploader')!;
      uploader.className = ''; // Remove all classes

      applyFullWidthMode(false);

      expect(uploader.classList.contains('max-w-2xl')).toBe(true);
    });

    it('should not add max-w-2xl class when enabled is false and a max-w class is already present', () => {
      const uploader = document.getElementById('tool-uploader')!;
      uploader.className = 'max-w-4xl';

      applyFullWidthMode(false);

      expect(uploader.classList.contains('max-w-2xl')).toBe(false);
      expect(uploader.classList.contains('max-w-4xl')).toBe(true);
    });

    it('should not affect other elements', () => {
      applyFullWidthMode(true);

      const otherElement = document.getElementById('other-element');
      expect(otherElement?.classList.contains('max-w-5xl')).toBe(true);
    });
  });

  describe('initFullWidthMode', () => {
    it('should apply full width mode if localStorage does not have fullWidthMode set to false', () => {
      localStorage.setItem('fullWidthMode', 'true');

      initFullWidthMode();

      const uploader = document.getElementById('tool-uploader');
      expect(uploader?.classList.contains('max-w-2xl')).toBe(false);
    });

    it('should apply full width mode if localStorage has no fullWidthMode set', () => {
      initFullWidthMode();

      const uploader = document.getElementById('tool-uploader');
      expect(uploader?.classList.contains('max-w-2xl')).toBe(false);
    });

    it('should not apply full width mode if localStorage has fullWidthMode set to false', () => {
      localStorage.setItem('fullWidthMode', 'false');

      initFullWidthMode();

      const uploader = document.getElementById('tool-uploader');
      expect(uploader?.classList.contains('max-w-2xl')).toBe(true);
    });
  });
});
