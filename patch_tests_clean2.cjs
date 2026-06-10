const fs = require('fs');

const filePath = 'src/tests/helpers.test.ts';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(/toBe\('0 Bytes'\)/g, "toBe('0 B')");
code = code.replace(/toBe\('500 Bytes'\)/g, "toBe('500 B')");
code = code.replace(/toBe\('1023 Bytes'\)/g, "toBe('1023 B')");

const findBlock = `    it('should handle decimal values', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });`;

const replacementBlock = `    it('should handle decimal values', () => {
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
      expect(formatBytes(1099511627776 * 1024 * 1024 * 1024 * 1024)).toBe('1 YB');
    });`;

code = code.replace(findBlock, replacementBlock);
fs.writeFileSync(filePath, code);
