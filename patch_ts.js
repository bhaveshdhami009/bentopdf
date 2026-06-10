const fs = require('fs');
const file = 'src/tests/compare/worker-api.test.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace standard ?t=x imports with ts-ignore so they don't break the build.
for (let i = 1; i <= 8; i++) {
  code = code.replace(
    `const api = await import('../../js/compare/worker-api?t=\${i}');`,
    `// @ts-ignore\n    const api = await import('../../js/compare/worker-api?t=\${i}');`
  );
}

fs.writeFileSync(file, code);
