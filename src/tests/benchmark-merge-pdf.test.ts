import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pdfjsLib from 'pdfjs-dist';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('lucide', () => ({
  createIcons: vi.fn(),
  icons: {},
}));

vi.mock('../js/ui.js', () => ({
  showLoader: vi.fn(),
  hideLoader: vi.fn(),
  showAlert: vi.fn(),
}));

vi.mock('../js/utils/password-prompt.js', () => ({
  batchDecryptIfNeeded: vi.fn((files) => Promise.resolve(files)),
}));

import { refreshMergeUI } from '../js/logic/merge-pdf-page';
import { state } from '../js/state';

describe('Merge PDF Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="merge-options" class="hidden"></div>
      <button id="process-btn"></button>
      <button id="file-mode-btn"></button>
      <button id="page-mode-btn"></button>
      <div id="file-mode-panel"></div>
      <div id="page-mode-panel"></div>
      <ul id="file-list"></ul>
    `;
    state.files = [];
  });

  it('should process files quickly', async () => {
    const numFiles = 10;
    const mockFiles = [];
    for (let i = 0; i < numFiles; i++) {
      mockFiles.push({
        name: `test${i}.pdf`,
        arrayBuffer: vi
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve(new ArrayBuffer(10)), 50)
              )
          ),
      } as unknown as File);
    }

    state.files = mockFiles;

    (
      pdfjsLib.getDocument as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => ({
      promise: new Promise((resolve) =>
        setTimeout(() => resolve({ numPages: 1 }), 50)
      ),
    }));

    const start = performance.now();
    await refreshMergeUI();
    const end = performance.now();

    expect(end - start).toBeLessThan(200);

    // In parallel, it should take ~100ms total (50ms arrayBuffer + 50ms getDocument).
    // In sequence, it takes 10 * 100ms = 1000ms.
    // So we can expect < 200ms if optimized.
  });
});
