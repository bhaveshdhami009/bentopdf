import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('worker-api fallback mechanisms', () => {
  const OriginalWorker = globalThis.Worker;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.Worker = OriginalWorker;
    vi.restoreAllMocks();
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
    let mockWorkerInstance: any;
    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;
        constructor() {
          mockWorkerInstance = this;
        }
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
    let mockWorkerInstance: any;
    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;
        constructor() {
          mockWorkerInstance = this;
        }
        postMessage(msg: any) {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
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

  it('handles worker resolving with pair success', async () => {
    const api = await import('../../js/compare/worker-api?t=5');
    let mockWorkerInstance: any;
    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;
        constructor() {
          mockWorkerInstance = this;
        }
        postMessage(msg: any) {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  id: msg.id,
                  type: 'pair',
                  pairs: [{ leftPageNumber: 1, rightPageNumber: 1 }],
                },
              });
            }
          }, 0);
        }
        terminate() {}
      }
    );

    const result = await api.pairPagesAsync([], []);
    expect(result).toEqual([{ leftPageNumber: 1, rightPageNumber: 1 }]);
  });

  it('handles specific error responses from worker', async () => {
    const api = await import('../../js/compare/worker-api?t=6');
    let mockWorkerInstance: any;
    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;
        constructor() {
          mockWorkerInstance = this;
        }
        postMessage(msg: any) {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  id: msg.id,
                  type: 'error',
                  message: 'something failed inside worker',
                },
              });
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

  it('handles mismatched message id', async () => {
    const api = await import('../../js/compare/worker-api?t=7');
    let mockWorkerInstance: any;
    vi.stubGlobal(
      'Worker',
      class {
        onerror: any;
        onmessage: any;
        constructor() {
          mockWorkerInstance = this;
        }
        postMessage(msg: any) {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  id: -999, // Mismatched ID
                  type: 'diff',
                },
              });
              // And then fail it with an error so the promise resolves via fallback
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
            if (this.onmessage) {
              this.onmessage({
                data: {
                  id: msg.id,
                  type: 'diff',
                  changes: [],
                  summary: {},
                },
              });
            }
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
