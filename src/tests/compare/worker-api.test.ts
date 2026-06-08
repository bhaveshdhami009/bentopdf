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

describe('worker-api', () => {
  let originalWorker: typeof global.Worker;

  beforeEach(() => {
    originalWorker = global.Worker;
    // Mock Worker to throw, so getWorker returns null, causing postToWorker to reject
    global.Worker = class {
      constructor() {
        throw new Error('Worker not supported');
      }
    } as unknown as typeof global.Worker;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.Worker = originalWorker;
  });

  describe('diffTextRunsAsync', () => {
    it('falls back to synchronous diffTextRuns when worker fails', async () => {
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
  });

  describe('pairPagesAsync', () => {
    it('falls back to synchronous pairPages when worker fails', async () => {
      const leftPages: ComparePageSignature[] = [];
      const rightPages: ComparePageSignature[] = [];
      const mockResult: ComparePagePair[] = [];

      vi.mocked(pairPages).mockReturnValue(mockResult);

      const result = await pairPagesAsync(leftPages, rightPages);

      expect(pairPages).toHaveBeenCalledWith(leftPages, rightPages);
      expect(result).toBe(mockResult);
    });
  });
});
