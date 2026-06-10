import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { diffTextRunsAsync, pairPagesAsync } from '../../js/compare/worker-api';
import { diffTextRuns } from '../../js/compare/engine/diff-text-runs';
import { pairPages } from '../../js/compare/engine/pair-pages';
import type {
  CompareTextItem,
  ComparePageSignature,
  CompareTextChange,
  ComparePagePair,
} from '../../js/compare/types';

vi.mock('../../js/compare/engine/diff-text-runs', () => ({
  diffTextRuns: vi.fn(),
}));

vi.mock('../../js/compare/engine/pair-pages', () => ({
  pairPages: vi.fn(),
}));

describe('worker-api fallback mechanisms', () => {
  const OriginalWorker = globalThis.Worker;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.Worker = OriginalWorker;
    vi.restoreAllMocks();
  });

  it('falls back to synchronous diffTextRuns when worker creation fails', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('Worker constructor failed');
        }
      }
    );

    const beforeItems: CompareTextItem[] = [];
    const afterItems: CompareTextItem[] = [];

    const mockResult = {
      changes: [] as CompareTextChange[],
      summary: {
        added: 0,
        removed: 0,
        modified: 0,
        moved: 0,
        styleChanged: 0,
      },
    };

    vi.mocked(diffTextRuns).mockReturnValue(mockResult);

    const result = await diffTextRunsAsync(beforeItems, afterItems);

    expect(diffTextRuns).toHaveBeenCalledWith(beforeItems, afterItems);
    expect(result).toBe(mockResult);
  });

  it('falls back to synchronous pairPages when worker creation fails', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('Worker constructor failed');
        }
      }
    );

    const leftPages: ComparePageSignature[] = [];
    const rightPages: ComparePageSignature[] = [];
    const mockResult: ComparePagePair[] = [];

    vi.mocked(pairPages).mockReturnValue(mockResult);

    const result = await pairPagesAsync(leftPages, rightPages);

    expect(pairPages).toHaveBeenCalledWith(leftPages, rightPages);
    expect(result).toBe(mockResult);
  });

  it('diffTextRunsAsync falls back to sync if Worker throws', async () => {
    const api = await import('../../js/compare/worker-api?t=1');

    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('Worker constructor failed');
        }
      }
    );

    const result = await api.diffTextRunsAsync([], []);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBeDefined();
  });

  it('pairPagesAsync falls back to sync if Worker throws', async () => {
    const api = await import('../../js/compare/worker-api?t=2');

    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('Worker constructor failed');
        }
      }
    );

    const result = await api.pairPagesAsync([], []);

    expect(result).toEqual([]);
  });

  it('handles worker crash (onerror)', async () => {
    const api = await import('../../js/compare/worker-api?t=3');

    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;

        postMessage() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 0);
        }

        terminate() {}
      }
    );

    const result = await api.diffTextRunsAsync([], []);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBeDefined();
  });

  it('handles worker resolving with diff success', async () => {
    const api = await import('../../js/compare/worker-api?t=4');

    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;

        postMessage(msg: any) {
          setTimeout(() => {
            this.onmessage?.({
              data: {
                id: msg.id,
                type: 'diff',
                changes: [],
                summary: {
                  added: 0,
                  removed: 0,
                  modified: 0,
                  moved: 0,
                  styleChanged: 0,
                },
              },
            });
          }, 0);
        }

        terminate() {}
      }
    );

    const result = await api.diffTextRunsAsync([], []);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBeDefined();
  });

  it('handles worker resolving with pair success', async () => {
    const api = await import('../../js/compare/worker-api?t=5');

    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;

        postMessage(msg: any) {
          setTimeout(() => {
            this.onmessage?.({
              data: {
                id: msg.id,
                type: 'pair',
                pairs: [{ leftPageNumber: 1, rightPageNumber: 1 }],
              },
            });
          }, 0);
        }

        terminate() {}
      }
    );

    const result = await api.pairPagesAsync([], []);

    expect(result).toEqual([
      {
        leftPageNumber: 1,
        rightPageNumber: 1,
      },
    ]);
  });

  it('handles specific error responses from worker', async () => {
    const api = await import('../../js/compare/worker-api?t=6');

    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;

        postMessage(msg: any) {
          setTimeout(() => {
            this.onmessage?.({
              data: {
                id: msg.id,
                type: 'error',
                message: 'something failed inside worker',
              },
            });
          }, 0);
        }

        terminate() {}
      }
    );

    const result = await api.diffTextRunsAsync([], []);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBeDefined();
  });

  it('handles mismatched message id', async () => {
    const api = await import('../../js/compare/worker-api?t=7');

    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;

        postMessage() {
          setTimeout(() => {
            this.onmessage?.({
              data: {
                id: -999,
                type: 'diff',
              },
            });

            this.onerror?.(new Event('error'));
          }, 0);
        }

        terminate() {}
      }
    );

    const result = await api.diffTextRunsAsync([], []);

    expect(result.changes).toEqual([]);
    expect(result.summary).toBeDefined();
  });

  it('does not re-initialize worker if already present', async () => {
    const api = await import('../../js/compare/worker-api?t=8');

    let workerInitCount = 0;

    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;

        constructor() {
          workerInitCount++;
        }

        postMessage(msg: any) {
          setTimeout(() => {
            this.onmessage?.({
              data: {
                id: msg.id,
                type: 'diff',
                changes: [],
                summary: {},
              },
            });
          }, 0);
        }

        terminate() {}
      }
    );

    await api.diffTextRunsAsync([], []);
    await api.diffTextRunsAsync([], []);

    expect(workerInitCount).toBe(1);
  });
});