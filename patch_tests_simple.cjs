const fs = require('fs');

const filePath = 'src/tests/helpers.test.ts';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(/'0 Bytes'/g, "'0 B'");
code = code.replace(/'500 Bytes'/g, "'500 B'");
code = code.replace(/'1023 Bytes'/g, "'1023 B'");

const insertionPoint = "  describe('parsePageRanges', () => {";
const extraTests = `  describe('formatBytes additional cases', () => {
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
      expect(formatBytes(1099511627776 * 1024 * 1024 * 1024 * 1024)).toBe('1 YB');
    });
  });

`;

code = code.replace(insertionPoint, extraTests + insertionPoint);
fs.writeFileSync(filePath, code);
