const fs = require('fs');
const filePath = 'src/tests/helpers.test.ts';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(/'0 Bytes'/g, "'0 B'");
code = code.replace(/'500 Bytes'/g, "'500 B'");
code = code.replace(/'1023 Bytes'/g, "'1023 B'");

const lines = code.split('\n');
let newLines = [];
let insideFormatBytes = false;
for (let i = 0; i < lines.length; i++) {
  newLines.push(lines[i]);
  if (lines[i].includes("describe('formatBytes', () => {")) {
    insideFormatBytes = true;
  }
  if (
    insideFormatBytes &&
    lines[i].includes("    it('should handle decimal values', () => {")
  ) {
    // found the last test inside formatBytes block. Wait until its end.
    let braces = 1;
    i++;
    while (i < lines.length && braces > 0) {
      newLines.push(lines[i]);
      if (lines[i].includes('{')) braces++;
      if (lines[i].includes('}')) braces--;
      i++;
    }
    i--;

    newLines.push('');
    newLines.push("    it('should handle negative values', () => {");
    newLines.push("      expect(formatBytes(-1024)).toBe('-1 KB');");
    newLines.push("      expect(formatBytes(-500)).toBe('-500 B');");
    newLines.push('    });');
    newLines.push('');
    newLines.push("    it('should handle negative decimals', () => {");
    newLines.push("      expect(formatBytes(1536, -1)).toBe('2 KB');");
    newLines.push('    });');
    newLines.push('');
    newLines.push("    it('should handle PB, EB, ZB, YB', () => {");
    newLines.push(
      "      expect(formatBytes(1099511627776 * 1024)).toBe('1 PB');"
    );
    newLines.push(
      "      expect(formatBytes(1099511627776 * 1024 * 1024)).toBe('1 EB');"
    );
    newLines.push(
      "      expect(formatBytes(1099511627776 * 1024 * 1024 * 1024)).toBe('1 ZB');"
    );
    newLines.push(
      "      expect(formatBytes(1099511627776 * 1024 * 1024 * 1024 * 1024)).toBe('1 YB');"
    );
    newLines.push('    });');
    insideFormatBytes = false;
  }
}
fs.writeFileSync(filePath, newLines.join('\n'));
