import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../js/state';

// Mock the UI functions
vi.mock('../js/ui', () => ({
  showLoader: vi.fn(),
  hideLoader: vi.fn(),
  showAlert: vi.fn(),
}));

// Mock the util function so it throws an error
vi.mock('../js/utils/csv-to-pdf', () => ({
  convertCsvToPdf: vi
    .fn()
    .mockRejectedValue(new Error('Simulated CSV parsing error')),
}));

// Mock lucide so it doesn't try to access the DOM incorrectly
vi.mock('lucide', () => ({
  createIcons: vi.fn(),
  icons: {},
}));

describe('csv-to-pdf-page', () => {
  beforeEach(() => {
    // Reset state
    state.files = [];

    // Set up basic DOM required by the script
    document.body.innerHTML = `
      <input type="file" id="file-input" />
      <div id="drop-zone"></div>
      <div id="convert-options"></div>
      <div id="file-display-area"></div>
      <div id="file-controls"></div>
      <button id="add-more-btn"></button>
      <button id="clear-files-btn"></button>
      <button id="back-to-tools"></button>
      <button id="process-btn"></button>
    `;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should handle conversion errors and show an alert', async () => {
    // We need to isolate the module import to trigger DOMContentLoaded logic,
    // or manually trigger the processBtn click after importing.

    // Import the module (this executes the top-level script, attaching event listeners)
    await import('../js/logic/csv-to-pdf-page');

    // Trigger DOMContentLoaded
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Set up some files in the state
    state.files = [new File(['test,data'], 'test.csv', { type: 'text/csv' })];

    // Spy on the UI functions we mocked
    const { hideLoader, showAlert } = await import('../js/ui');

    // Also spy on console.error to avoid test output noise, but we can just let it run.
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // Get the process button and click it to trigger convertToPdf
    const processBtn = document.getElementById('process-btn');
    processBtn?.click();

    // Since convertToPdf is async and we just clicked a button, we need to wait for microtasks to flush
    await vi.waitFor(() => {
      expect(hideLoader).toHaveBeenCalled();
      expect(showAlert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Simulated CSV parsing error')
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
