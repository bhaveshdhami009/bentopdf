const fs = require('fs');

const filePath = 'src/tests/helpers.test.ts';
let code = fs.readFileSync(filePath, 'utf-8');

// Replace all occurrences of "Bytes" with "B" inside the formatBytes tests
const describeRegex =
  /describe\('formatBytes',\s*\(\)\s*=>\s*\{([\s\S]*?)\}\);/;
const match = code.match(describeRegex);

if (match) {
  let tests = match[1];
  tests = tests.replace(/toBe\('0 Bytes'\)/g, "toBe('0 B')");
  tests = tests.replace(/toBe\('500 Bytes'\)/g, "toBe('500 B')");
  tests = tests.replace(/toBe\('1023 Bytes'\)/g, "toBe('1023 B')");

  const newTests =
    tests +
    `
    it('should handle negative values', () => {
      expect(formatBytes(-1024)).toBe('-1 KB');
      expect(formatBytes(-500)).toBe('-500 B');
    });

    it('should handle negative decimals', () => {
      expect(formatBytes(1536, -1)).toBe('2 KB'); // negative falls back to 0
    });

    it('should handle PB, EB, ZB, YB', () => {
      expect(formatBytes(1099511627776 * 1024)).toBe('1 PB');
      expect(formatBytes(1099511627776 * 1024 * 1024)).toBe('1 EB');
      expect(formatBytes(1099511627776 * 1024 * 1024 * 1024)).toBe('1 ZB');
      expect(formatBytes(1099511627776 * 1024 * 1024 * 1024 * 1024)).toBe('1 YB');
    });
  `;

  code = code.replace(
    describeRegex,
    "describe('formatBytes', () => {" + newTests + '});'
  );
  fs.writeFileSync(filePath, code);
  console.log('Successfully replaced formatBytes tests.');
} else {
  console.log('Could not find formatBytes describe block.');
}
