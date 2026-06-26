import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Mock canvas and 2d context for jsdom
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray([255, 0, 0, 255]), // Mock Red pixel
    width: 1,
    height: 1,
  })),
  putImageData: vi.fn(),
})) as any;

HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => {
  if (cb) (cb as any)(new Blob(['mock-image-data'], { type: 'image/jpeg' }));
});

// We need to mock rete, pdfjs, and pdf-lib
vi.mock('rete', () => ({
  ClassicPreset: {
    Node: class {
      constructor() {}
      addInput() {}
      addOutput() {}
      addControl() {}
      controls: Record<string, unknown> = {};
    },
    Input: class {
      constructor(
        public socket: unknown,
        public label: string
      ) {}
    },
    Output: class {
      constructor(
        public socket: unknown,
        public label: string
      ) {}
    },
  },
}));

vi.mock('@/js/workflow/sockets', () => ({
  pdfSocket: {},
}));

vi.mock('@/js/workflow/nodes/base-node', () => ({
  BaseWorkflowNode: class {
    constructor() {}
    addInput() {}
    addOutput() {}
    addControl() {}
    controls: Record<string, unknown> = {};
  },
}));

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 100, height: 100 }),
        render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
      }),
    }),
  }),
}));

vi.mock('pdf-lib', () => {
  const PDFDocument = {
    create: vi.fn().mockResolvedValue({
      embedJpg: vi.fn().mockResolvedValue({}),
      addPage: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      getPageCount: vi.fn().mockReturnValue(1),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }),
  };
  return { PDFDocument };
});

vi.mock('@/js/utils/image-effects', () => ({
  applyGreyscale: vi.fn(),
}));

vi.mock('@/js/workflow/types', () => ({
  requirePdfInput: vi.fn((inputs) => inputs['pdf']),
  processBatch: vi.fn(async (inputs, fn) => {
    const results = [];
    for (const input of inputs) {
      results.push(await fn(input));
    }
    return results;
  }),
}));

import { GreyscaleNode } from '@/js/workflow/nodes/greyscale-node';
import { applyGreyscale } from '@/js/utils/image-effects';
import { wfError } from '@/js/workflow/errors';

describe('GreyscaleNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should instantiate and have correct properties', () => {
    const node = new GreyscaleNode();
    expect(node).toBeDefined();
    expect(node.category).toBe('Edit & Annotate');
    expect(node.icon).toBe('ph-palette');
    expect(node.description).toBe('Convert to greyscale');
  });

  it('should process pdf via data()', async () => {
    const node = new GreyscaleNode();
    const mockInput = [
      {
        type: 'pdf' as const,
        document: {} as never,
        bytes: new Uint8Array([1, 2, 3]),
        filename: 'test.pdf',
      },
    ];

    const result = (await node.data({ pdf: mockInput })) as any;

    expect(applyGreyscale).toHaveBeenCalled();
    expect(result.pdf[0].filename).toBe('test_greyscale.pdf');
    expect(result.pdf[0].bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('should handle errors when canvas context is not available', async () => {
    // Mock getContext to return null temporarily
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi
      .fn()
      .mockReturnValue(null) as any;

    const node = new GreyscaleNode();
    const mockInput = [
      {
        type: 'pdf' as const,
        document: {} as never,
        bytes: new Uint8Array([1, 2, 3]),
        filename: 'test.pdf',
      },
    ];

    await expect(node.data({ pdf: mockInput })).rejects.toThrowError(
      wfError('failedToGetCanvasContext', { page: 1 })
    );

    // Restore getContext
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('should handle errors when canvas toBlob fails', async () => {
    // Mock toBlob to pass null temporarily
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => {
      if (cb) (cb as any)(null);
    }) as any;

    const node = new GreyscaleNode();
    const mockInput = [
      {
        type: 'pdf' as const,
        document: {} as never,
        bytes: new Uint8Array([1, 2, 3]),
        filename: 'test.pdf',
      },
    ];

    await expect(node.data({ pdf: mockInput })).rejects.toThrowError(
      wfError('failedToRenderPageToImage', { page: 1 })
    );

    // Restore toBlob
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  });

  it('should handle errors when no pages are processed', async () => {
    // Mock getPageCount to return 0 temporarily
    const originalCreate = PDFDocument.create;
    (PDFDocument.create as any) = vi.fn().mockResolvedValue({
      embedJpg: vi.fn().mockResolvedValue({}),
      addPage: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      getPageCount: vi.fn().mockReturnValue(0),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    });

    const node = new GreyscaleNode();
    const mockInput = [
      {
        type: 'pdf' as const,
        document: {} as never,
        bytes: new Uint8Array([1, 2, 3]),
        filename: 'test.pdf',
      },
    ];

    await expect(node.data({ pdf: mockInput })).rejects.toThrowError(
      wfError('noPagesProcessed')
    );

    // Restore PDFDocument.create
    PDFDocument.create = originalCreate;
  });
});
