import { describe, it, expect } from 'vitest';
import {
  getStandardPageName,
  convertPoints,
  hexToRgb,
  formatBytes,
  parsePageRanges,
  escapeHtml,
  getCleanPdfFilename,
  uint8ArrayToBase64,
} from '../js/utils/helpers';

describe('helpers', () => {
  describe('escapeHtml', () => {
    it('should return empty string if input is empty', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should return same string if there are no special characters', () => {
      expect(escapeHtml('hello world')).toBe('hello world');
    });

    it('should escape &', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('should escape <', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b');
    });

    it('should escape >', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    it('should escape "', () => {
      expect(escapeHtml('a " b')).toBe('a &quot; b');
    });

    it("should escape '", () => {
      expect(escapeHtml("a ' b")).toBe('a &#039; b');
    });

    it('should escape multiple occurrences of special characters', () => {
      expect(escapeHtml('<<>>&&""\'\'')).toBe(
        '&lt;&lt;&gt;&gt;&amp;&amp;&quot;&quot;&#039;&#039;'
      );
    });

    it('should escape combinations of special characters', () => {
      expect(escapeHtml('<script>alert("XSS & fun")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; fun&quot;)&lt;/script&gt;'
      );
    });
  });
  describe('getStandardPageName', () => {
    it('should identify A4 portrait', () => {
      expect(getStandardPageName(595.28, 841.89)).toBe('A4');
    });

    it('should identify A4 landscape', () => {
      expect(getStandardPageName(841.89, 595.28)).toBe('A4');
    });

    it('should identify Letter size', () => {
      expect(getStandardPageName(612, 792)).toBe('Letter');
    });

    it('should identify Legal size', () => {
      expect(getStandardPageName(612, 1008)).toBe('Legal');
    });

    it('should identify A3 size', () => {
      expect(getStandardPageName(841.89, 1190.55)).toBe('A3');
    });

    it('should handle floating point variations within tolerance', () => {
      expect(getStandardPageName(595.5, 841.9)).toBe('A4');
    });

    it('should return Custom for non-standard sizes', () => {
      expect(getStandardPageName(600, 800)).toBe('Custom');
    });

    it('should identify Tabloid portrait', () => {
      expect(getStandardPageName(792, 1224)).toBe('Tabloid');
    });

    it('should identify Tabloid landscape', () => {
      expect(getStandardPageName(1224, 792)).toBe('Tabloid');
    });

    it('should identify A5 portrait', () => {
      expect(getStandardPageName(419.53, 595.28)).toBe('A5');
    });

    it('should identify A5 landscape', () => {
      expect(getStandardPageName(595.28, 419.53)).toBe('A5');
    });

    it('should identify size just inside tolerance limit', () => {
      // A4 is 595.28 x 841.89, tolerance is < 1
      expect(getStandardPageName(595.28 + 0.99, 841.89 - 0.99)).toBe('A4');
    });

    it('should return Custom for size exactly at or outside tolerance limit', () => {
      expect(getStandardPageName(595.28 + 1.0, 841.89)).toBe('Custom');
      expect(getStandardPageName(595.28, 841.89 + 1.1)).toBe('Custom');
    });

    it('should return Custom for zero or negative dimensions', () => {
      expect(getStandardPageName(0, 0)).toBe('Custom');
      expect(getStandardPageName(-595.28, -841.89)).toBe('Custom');
    });
  });

  describe('convertPoints', () => {
    it('should convert points to inches', () => {
      expect(convertPoints(72, 'in')).toBe('1.00');
      expect(convertPoints(144, 'in')).toBe('2.00');
    });

    it('should convert points to millimeters', () => {
      expect(convertPoints(72, 'mm')).toBe('25.40');
    });

    it('should convert points to pixels', () => {
      expect(convertPoints(72, 'px')).toBe('96.00');
    });

    it('should return points as is for pt unit', () => {
      expect(convertPoints(100, 'pt')).toBe('100.00');
    });

    it('should default to points for unknown unit', () => {
      expect(convertPoints(50, 'unknown')).toBe('50.00');
    });

    it('should handle decimal values', () => {
      expect(convertPoints(36, 'in')).toBe('0.50');
    });
  });

  describe('hexToRgb', () => {
    it('should convert hex to RGB (with #)', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
    });

    it('should convert hex to RGB (without #)', () => {
      expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 1, b: 0 });
    });

    it('should handle blue color', () => {
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 1 });
    });

    it('should handle white color', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 1, g: 1, b: 1 });
    });

    it('should handle black color', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should handle gray color', () => {
      const result = hexToRgb('#808080');
      expect(result.r).toBeCloseTo(0.502, 2);
      expect(result.g).toBeCloseTo(0.502, 2);
      expect(result.b).toBeCloseTo(0.502, 2);
    });

    it('should return black for invalid hex', () => {
      expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should be case insensitive', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 1, g: 0, b: 0 });
    });

    it('should convert 3-character hex to RGB (with #)', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 1, g: 0, b: 0 });
    });

    it('should convert 3-character hex to RGB (without #)', () => {
      expect(hexToRgb('0f0')).toEqual({ r: 0, g: 1, b: 0 });
    });

    it('should handle 3-character hex case insensitively', () => {
      expect(hexToRgb('#00F')).toEqual({ r: 0, g: 0, b: 1 });
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(2048)).toBe('2 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(5242880)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle custom decimal places', () => {
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
      expect(formatBytes(1536, 0)).toBe('2 KB');
    });

    it('should handle decimal values', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should handle negative values', () => {
      expect(formatBytes(-1024)).toBe('-1 KB');
      expect(formatBytes(-500)).toBe('-500 B');
    });

    it('should handle negative decimals', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB');
    });

    it('should handle PB, EB, ZB, YB', () => {
      expect(formatBytes(1099511627776 * 1024)).toBe('1 PB');
      expect(formatBytes(1099511627776 * 1024 * 1024)).toBe('1 EB');
      expect(formatBytes(1099511627776 * 1024 * 1024 * 1024)).toBe('1 ZB');
      expect(formatBytes(1099511627776 * 1024 * 1024 * 1024 * 1024)).toBe(
        '1 YB'
      );
    });
  });

  describe('parsePageRanges', () => {
    const totalPages = 10;

    it('should return all pages for empty string', () => {
      expect(parsePageRanges('', totalPages)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);
    });

    it('should return all pages for whitespace', () => {
      expect(parsePageRanges('   ', totalPages)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);
    });

    it('should parse single page', () => {
      expect(parsePageRanges('5', totalPages)).toEqual([4]);
    });

    it('should parse multiple single pages', () => {
      expect(parsePageRanges('1,3,5', totalPages)).toEqual([0, 2, 4]);
    });

    it('should parse page ranges', () => {
      expect(parsePageRanges('1-3', totalPages)).toEqual([0, 1, 2]);
    });

    it('should parse mixed ranges and single pages', () => {
      expect(parsePageRanges('1,3-5,7', totalPages)).toEqual([0, 2, 3, 4, 6]);
    });

    it('should handle spaces in input', () => {
      expect(parsePageRanges(' 1 , 3 - 5 , 7 ', totalPages)).toEqual([
        0, 2, 3, 4, 6,
      ]);
    });

    it('should remove duplicates and sort', () => {
      expect(parsePageRanges('5,3,5,1-3', totalPages)).toEqual([0, 1, 2, 4]);
    });

    it('should skip invalid page numbers', () => {
      expect(parsePageRanges('0,1,15,5', totalPages)).toEqual([0, 4]);
    });

    it('should skip invalid ranges', () => {
      expect(parsePageRanges('1-15,3-5', totalPages)).toEqual([2, 3, 4]);
    });

    it('should skip ranges where start > end', () => {
      expect(parsePageRanges('5-3,1-2', totalPages)).toEqual([0, 1]);
    });

    it('should handle all pages explicitly', () => {
      expect(parsePageRanges('1-10', totalPages)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);
    });

    it('should skip non-numeric values', () => {
      expect(parsePageRanges('1,abc,5', totalPages)).toEqual([0, 4]);
    });
  });

  describe('getCleanPdfFilename', () => {
    it('should remove .pdf extension', () => {
      expect(getCleanPdfFilename('document.pdf')).toBe('document');
    });

    it('should be case insensitive when removing extension', () => {
      expect(getCleanPdfFilename('document.PDF')).toBe('document');
      expect(getCleanPdfFilename('document.PdF')).toBe('document');
    });

    it('should not modify filename without .pdf extension', () => {
      expect(getCleanPdfFilename('document')).toBe('document');
      expect(getCleanPdfFilename('document.jpg')).toBe('document.jpg');
    });

    it('should trim whitespace', () => {
      expect(getCleanPdfFilename('  document.pdf  ')).toBe('document');
      expect(getCleanPdfFilename('  document  ')).toBe('document');
    });

    it('should truncate strings longer than 80 characters', () => {
      const longName = 'a'.repeat(90) + '.pdf';
      const result = getCleanPdfFilename(longName);

      expect(result.length).toBe(80);
      expect(result).toBe('a'.repeat(80));
    });

    it('should handle strings exactly 80 characters long', () => {
      const exactName = 'a'.repeat(80) + '.pdf';
      const result = getCleanPdfFilename(exactName);

      expect(result.length).toBe(80);
      expect(result).toBe('a'.repeat(80));
    });

    it('should handle empty strings', () => {
      expect(getCleanPdfFilename('')).toBe('');
      expect(getCleanPdfFilename('   ')).toBe('');
    });

    it('should only remove .pdf at the end of the filename', () => {
      expect(getCleanPdfFilename('my.pdf.file.pdf')).toBe('my.pdf.file');
      expect(getCleanPdfFilename('my.pdf.file')).toBe('my.pdf.file');
    });
  });

  describe('uint8ArrayToBase64', () => {
    it('should convert an empty array', () => {
      expect(uint8ArrayToBase64(new Uint8Array(0))).toBe('');
    });

    it('should convert a simple string to base64', () => {
      const str = 'hello world';
      const arr = new Uint8Array(str.length);

      for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i);
      }

      expect(uint8ArrayToBase64(arr)).toBe(btoa(str));
    });

    it('should handle large arrays spanning multiple chunks', () => {
      const size = 10000;
      const arr = new Uint8Array(size);
      let expectedStr = '';

      for (let i = 0; i < size; i++) {
        const val = i % 256;
        arr[i] = val;
        expectedStr += String.fromCharCode(val);
      }

      expect(uint8ArrayToBase64(arr)).toBe(btoa(expectedStr));
    });

    it('should correctly encode all byte values', () => {
      const arr = new Uint8Array(256);
      let expectedStr = '';

      for (let i = 0; i < 256; i++) {
        arr[i] = i;
        expectedStr += String.fromCharCode(i);
      }

      expect(uint8ArrayToBase64(arr)).toBe(btoa(expectedStr));
    });
  });
});
