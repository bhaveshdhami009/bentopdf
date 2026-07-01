import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('rete', () => ({
  ClassicPreset: {
    Node: class {
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
    InputControl: class {
      value: string;
      constructor(
        public type: string,
        public options: { initial: string }
      ) {
        this.value = options.initial;
      }
    },
  },
}));

vi.mock('@/js/workflow/sockets', () => ({
  pdfSocket: {},
}));

vi.mock('@/js/workflow/nodes/base-node', () => ({
  BaseWorkflowNode: class {
    addInput() {}
    addOutput() {}
    addControl() {}
    controls: Record<string, unknown> = {};
  },
}));

vi.mock('@/js/workflow/types', () => ({
  requirePdfInput: vi.fn((inputs: Record<string, unknown[]>) => inputs['pdf']),
  processBatch: vi.fn(
    async (
      inputs: Array<{ bytes: Uint8Array; filename: string }>,
      fn: (input: { bytes: Uint8Array; filename: string }) => Promise<unknown>
    ) => {
      const results = [];
      for (const input of inputs) {
        results.push(await fn(input));
      }
      return results;
    }
  ),
}));

vi.mock('@/js/utils/helpers.js', () => ({
  initializeQpdf: vi.fn().mockResolvedValue({
    FS: {
      writeFile: vi.fn(),
      readFile: vi.fn().mockReturnValue(new Uint8Array([9, 8, 7])),
      unlink: vi.fn(),
    },
    callMain: vi.fn(),
  }),
}));

vi.mock('@/js/utils/load-pdf-document.js', () => ({
  loadPdfDocument: vi.fn().mockResolvedValue({}),
}));

import { LinearizeNode } from '@/js/workflow/nodes/linearize-node';
import { initializeQpdf } from '@/js/utils/helpers.js';
import { loadPdfDocument } from '@/js/utils/load-pdf-document.js';

describe('LinearizeNode', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockQpdf: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockQpdf = await initializeQpdf();
    mockQpdf.FS.writeFile.mockClear();
    mockQpdf.FS.readFile.mockClear();
    mockQpdf.FS.unlink.mockClear();
    mockQpdf.callMain.mockClear();
  });

  it('should be instantiable', () => {
    const node = new LinearizeNode();
    expect(node).toBeDefined();
  });

  it('should have correct category, icon, and description', () => {
    const node = new LinearizeNode();
    expect(node.category).toBe('Optimize & Repair');
    expect(node.icon).toBe('ph-gauge');
    expect(node.description).toBe('Linearize PDF for fast web viewing');
  });

  it('should call qpdf methods correctly and return linearized pdf', async () => {
    const node = new LinearizeNode();
    const mockInput = [
      {
        type: 'pdf' as const,
        document: {} as never,
        bytes: new Uint8Array([1, 2, 3]),
        filename: 'test.pdf',
      },
    ];

    const result = (await node.data({ pdf: mockInput })) as unknown as {
      pdf: Array<{ bytes: Uint8Array; filename: string }>;
    };

    expect(initializeQpdf).toHaveBeenCalled();

    // File writing
    expect(mockQpdf.FS.writeFile).toHaveBeenCalledTimes(1);
    expect(mockQpdf.FS.writeFile.mock.calls[0][0]).toMatch(
      /\/tmp\/input_linearize_.*\.pdf/
    );
    expect(mockQpdf.FS.writeFile.mock.calls[0][1]).toEqual(
      new Uint8Array([1, 2, 3])
    );

    // Call main
    expect(mockQpdf.callMain).toHaveBeenCalledTimes(1);
    const mainArgs = mockQpdf.callMain.mock.calls[0][0];
    expect(mainArgs[0]).toMatch(/\/tmp\/input_linearize_.*\.pdf/);
    expect(mainArgs[1]).toBe('--linearize');
    expect(mainArgs[2]).toMatch(/\/tmp\/output_linearize_.*\.pdf/);

    // File reading
    expect(mockQpdf.FS.readFile).toHaveBeenCalledTimes(1);
    expect(mockQpdf.FS.readFile.mock.calls[0][0]).toEqual(mainArgs[2]);

    // Clean up
    expect(mockQpdf.FS.unlink).toHaveBeenCalledTimes(2);
    expect(mockQpdf.FS.unlink.mock.calls[0][0]).toEqual(mainArgs[0]);
    expect(mockQpdf.FS.unlink.mock.calls[1][0]).toEqual(mainArgs[2]);

    // Load pdf doc
    expect(loadPdfDocument).toHaveBeenCalledWith(new Uint8Array([9, 8, 7]));

    // Result
    expect(result.pdf[0].bytes).toEqual(new Uint8Array([9, 8, 7]));
    expect(result.pdf[0].filename).toBe('test_linearized.pdf');
  });

  it('should cleanup files even if callMain throws an error', async () => {
    const node = new LinearizeNode();
    const mockInput = [
      {
        type: 'pdf' as const,
        document: {} as never,
        bytes: new Uint8Array([1, 2, 3]),
        filename: 'error.pdf',
      },
    ];

    mockQpdf.callMain.mockImplementationOnce(() => {
      throw new Error('QPDF Error');
    });

    await expect(node.data({ pdf: mockInput })).rejects.toThrow('QPDF Error');

    expect(mockQpdf.FS.writeFile).toHaveBeenCalledTimes(1);
    expect(mockQpdf.FS.unlink).toHaveBeenCalledTimes(2); // Should still cleanup
  });

  it('should ignore unlink errors during cleanup', async () => {
    const node = new LinearizeNode();
    const mockInput = [
      {
        type: 'pdf' as const,
        document: {} as never,
        bytes: new Uint8Array([1, 2, 3]),
        filename: 'cleanup.pdf',
      },
    ];

    mockQpdf.FS.unlink.mockImplementation(() => {
      throw new Error('Unlink failed');
    });

    const result = (await node.data({ pdf: mockInput })) as unknown as {
      pdf: Array<{ bytes: Uint8Array; filename: string }>;
    };

    expect(result.pdf[0].filename).toBe('cleanup_linearized.pdf');
    expect(mockQpdf.FS.unlink).toHaveBeenCalledTimes(2); // Attempted unlink twice
  });
});
