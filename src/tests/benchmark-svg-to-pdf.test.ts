import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { SvgToPdfNode } from '../js/workflow/nodes/svg-to-pdf-node.js';

vi.mock('rete', () => {
  return {
    ClassicPreset: {
      Output: class {},
      Socket: class {},
      Node: class {
        constructor() {
          this.outputs = {};
          this.inputs = {};
        }
        addOutput() {}
        addInput() {}
      },
    },
  };
});

describe('Benchmark SVG processing loop', () => {
  it('measures execution time of sequential vs parallel', async () => {
    const files = Array.from({ length: 10 }).map((_, i) => {
      const svgContent = `<svg width="100" height="100"><circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" /><text x="50" y="55" font-family="Verdana" font-size="20" fill="blue" text-anchor="middle">${i}</text></svg>`;
      return new File([svgContent], `image${i}.svg`, { type: 'image/svg+xml' });
    });

    const node = new SvgToPdfNode();
    vi.spyOn(node as any, 'svgToPng').mockImplementation(async (text) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            new Uint8Array([
              137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0,
              0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 11,
              73, 68, 65, 84, 8, 153, 99, 248, 15, 4, 0, 9, 251, 3, 253, 227,
              85, 242, 156, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
            ])
          );
        }, 10);
      });
    });

    const startSequential = performance.now();
    const docSeq = await PDFDocument.create();
    for (const file of files) {
      const svgText = await file.text();
      const pngBytes = await (node as any).svgToPng(svgText);
      const pngImage = await docSeq.embedPng(pngBytes);
      const page = docSeq.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });
    }
    const endSequential = performance.now();

    const startParallel = performance.now();
    const docPar = await PDFDocument.create();
    const pngImages = await Promise.all(
      files.map(async (file) => {
        const svgText = await file.text();
        const pngBytes = await (node as any).svgToPng(svgText);
        return await docPar.embedPng(pngBytes);
      })
    );
    for (const pngImage of pngImages) {
      const page = docPar.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });
    }
    const endParallel = performance.now();

    const seqTime = endSequential - startSequential;
    const parTime = endParallel - startParallel;

    // We expect parallel to be at least 30% faster (usually 100ms vs 10ms ideal, maybe 120ms vs 20ms)
    expect(parTime).toBeLessThan(seqTime * 0.7);
  });
});
