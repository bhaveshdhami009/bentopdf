import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  CompareTextItem,
  ComparePageSignature,
} from '../../../js/compare/types';
import { diffTextRuns } from '../../../js/compare/engine/diff-text-runs';
import { pairPages } from '../../../js/compare/engine/pair-pages';

// Mock the imported modules
vi.mock('../../../js/compare/engine/diff-text-runs', () => ({
  diffTextRuns: vi.fn(),
}));

vi.mock('../../../js/compare/engine/pair-pages', () => ({
  pairPages: vi.fn(),
}));

describe('compare.worker', () => {
  let onmessageHandler: (e: MessageEvent) => void;
  let mockPostMessage: any;
  let originalSelf: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Save original self
    originalSelf = globalThis.self;

    // Set up mock postMessage
    mockPostMessage = vi.fn();

    // Define a fake self with postMessage
    (globalThis as any).self = {
      postMessage: mockPostMessage,
      location: { origin: 'http://localhost:3000' },
    };

    // Dynamically import the worker to ensure it uses the mocked self
    // Need to reset modules so it re-evaluates
    vi.resetModules();
    await import('../../../js/compare/engine/compare.worker.ts');

    // The worker assigns to self.onmessage
    onmessageHandler = (globalThis as any).self.onmessage;
  });

  afterEach(() => {
    (globalThis as any).self = originalSelf;
  });

  it('should ignore messages from different origins', () => {
    onmessageHandler({
      origin: 'http://evil.com',
      data: { type: 'diff', id: 1, beforeItems: [], afterItems: [] },
    } as any);

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should ignore invalid messages (not an object)', () => {
    onmessageHandler({
      origin: 'http://localhost:3000',
      data: null,
    } as any);
    onmessageHandler({
      origin: 'http://localhost:3000',
      data: 'string',
    } as any);

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should ignore invalid messages (no id)', () => {
    onmessageHandler({
      origin: 'http://localhost:3000',
      data: { type: 'diff', beforeItems: [], afterItems: [] },
    } as any);

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should ignore invalid diff messages (invalid payload)', () => {
    onmessageHandler({
      origin: 'http://localhost:3000',
      data: {
        type: 'diff',
        id: 1,
        beforeItems: 'not an array',
        afterItems: [],
      },
    } as any);

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should ignore invalid pair messages (invalid payload)', () => {
    onmessageHandler({
      origin: 'http://localhost:3000',
      data: { type: 'pair', id: 1, leftPages: [], rightPages: 'not an array' },
    } as any);

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should ignore invalid messages (unknown type)', () => {
    onmessageHandler({
      origin: 'http://localhost:3000',
      data: { type: 'unknown', id: 1 },
    } as any);

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should handle diff messages successfully', () => {
    const mockSummary = {
      added: 1,
      removed: 0,
      modified: 0,
      moved: 0,
      styleChanged: 0,
    };
    vi.mocked(diffTextRuns).mockReturnValue({
      changes: [],
      summary: mockSummary,
    });

    onmessageHandler({
      origin: 'http://localhost:3000',
      data: { type: 'diff', id: 42, beforeItems: [], afterItems: [] },
    } as any);

    expect(diffTextRuns).toHaveBeenCalledWith([], []);
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'diff',
      id: 42,
      changes: [],
      summary: mockSummary,
    });
  });

  it('should handle pair messages successfully', () => {
    const mockPairs: any[] = [];
    vi.mocked(pairPages).mockReturnValue(mockPairs);

    onmessageHandler({
      origin: 'http://localhost:3000',
      data: { type: 'pair', id: 43, leftPages: [], rightPages: [] },
    } as any);

    expect(pairPages).toHaveBeenCalledWith([], []);
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'pair',
      id: 43,
      pairs: mockPairs,
    });
  });

  it('should safely fall through if type changes after validation', () => {
    // This is to hit the branch coverage for the else path of `else if (msg.type === 'pair')` on line 80
    // By making the type getter return 'diff' for isValidMessage, but then 'unknown' later
    let typeChecks = 0;
    const sneakyData = {
      id: 1,
      beforeItems: [],
      afterItems: [],
      get type() {
        typeChecks++;
        // 1st check in isValidMessage: m.type === 'diff'
        // 2nd check in onmessage: msg.type === 'diff'
        // 3rd check in onmessage: msg.type === 'pair'
        if (typeChecks === 1) return 'diff';
        return 'unknown';
      },
    };

    onmessageHandler({
      origin: 'http://localhost:3000',
      data: sneakyData,
    } as any);

    // Nothing should happen, it should just exit gracefully
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully during diff and post error result', () => {
    const errorMsg = 'Diff engine failure';
    vi.mocked(diffTextRuns).mockImplementation(() => {
      throw new Error(errorMsg);
    });

    onmessageHandler({
      origin: 'http://localhost:3000',
      data: { type: 'diff', id: 44, beforeItems: [], afterItems: [] },
    } as any);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'error',
      id: 44,
      message: errorMsg,
    });
  });

  it('should handle non-Error objects thrown during execution', () => {
    vi.mocked(pairPages).mockImplementation(() => {
      throw 'String error';
    });

    onmessageHandler({
      origin: 'http://localhost:3000',
      data: { type: 'pair', id: 45, leftPages: [], rightPages: [] },
    } as any);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'error',
      id: 45,
      message: 'String error',
    });
  });
});
