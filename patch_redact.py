with open('src/js/logic/redact.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "import type { WindowWithPDFLib }" in line:
        continue
    if "const { PDFDocument, rgb } = (window as unknown as WindowWithPDFLib).PDFLib!;" in line:
        new_lines.append("const { PDFDocument, rgb } = window.PDFLib!;\n")
    else:
        new_lines.append(line)

with open('src/js/logic/redact.ts', 'w') as f:
    f.writelines(new_lines)
