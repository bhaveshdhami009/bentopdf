import { describe, expect, it, vi } from 'vitest';
import { pairPagesAsync, diffTextRunsAsync } from '@/js/compare/worker-api.ts';
import * as pairPagesModule from '@/js/compare/engine/pair-pages.ts';
import * as diffTextRunsModule from '@/js/compare/engine/diff-text-runs.ts';

describe('worker-api', () => {
  it('falls back to synchronous pairPages on worker error', async () => {
    const pairPagesSpy = vi.spyOn(pairPagesModule, 'pairPages');

    // In Vitest without a mock worker, this should fall back immediately
    // because Worker is not available in standard Node.js environment
    // or postToWorker fails
    await pairPagesAsync([], []);

    expect(pairPagesSpy).toHaveBeenCalledWith([], []);
  });

  it('falls back to synchronous diffTextRuns on worker error', async () => {
    const diffTextRunsSpy = vi.spyOn(diffTextRunsModule, 'diffTextRuns');

    // In Vitest without a mock worker, this should fall back immediately
    await diffTextRunsAsync([], []);

    expect(diffTextRunsSpy).toHaveBeenCalledWith([], []);
  });
});
