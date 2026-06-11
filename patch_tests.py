import re

with open('src/tests/compare/worker-api.test.ts', 'r') as f:
    content = f.read()

content = re.sub(r"\?t=\d+", "", content)

with open('src/tests/compare/worker-api.test.ts', 'w') as f:
    f.write(content)
