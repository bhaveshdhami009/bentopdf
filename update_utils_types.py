import re

with open('src/js/types/utils-types.ts', 'r') as f:
    content = f.read()

# Remove the WindowWithPDFLib interface definition
content = re.sub(r'export interface WindowWithPDFLib \{\s*PDFLib\?: typeof import\(\'pdf-lib\'\);\s*\}\s*', '', content)

with open('src/js/types/utils-types.ts', 'w') as f:
    f.write(content)
