const fs = require('fs');
const file = 'src/tests/compare/worker-api.test.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/import\('\.\.\/\.\.\/js\/compare\/worker-api\?t=[0-9]+'\)/g, "import('../../js/compare/worker-api')");
fs.writeFileSync(file, code);
