import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _testExports } from '../js/logic/encrypt-pdf-page';
import * as helpers from '../js/utils/helpers';
import * as ui from '../js/ui';

vi.mock('../js/ui', () => ({
  showAlert: vi.fn(),
}));

vi.mock('../js/utils/helpers', () => ({
  downloadFile: vi.fn(),
  formatBytes: vi.fn(),
  initializeQpdf: vi.fn(),
  readFileAsArrayBuffer: vi.fn(),
}));

describe('encryptPdf error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <input id="user-password-input" value="password" />
      <input id="owner-password-input" value="" />
      <div id="loader-modal" class="hidden"></div>
      <div id="loader-text"></div>
    `;
    _testExports.pageState.file = new File(['dummy content'], 'test.pdf', {
      type: 'application/pdf',
    });
  });

  it('should handle qpdf execution error and show alert', async () => {
    const qpdfMock = {
      FS: {
        writeFile: vi.fn(),
        readFile: vi.fn(),
        unlink: vi.fn(),
      },
      callMain: vi.fn().mockImplementation(() => {
        throw new Error('Test qpdf error');
      }),
    };

    vi.spyOn(helpers, 'initializeQpdf').mockResolvedValue(qpdfMock as any);
    vi.spyOn(helpers, 'readFileAsArrayBuffer').mockResolvedValue(
      new ArrayBuffer(8)
    );
    const showAlertSpy = vi.spyOn(ui, 'showAlert');

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await _testExports.encryptPdf();

    expect(qpdfMock.callMain).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'qpdf execution error:',
      expect.any(Error)
    );
    expect(showAlertSpy).toHaveBeenCalledWith(
      'Encryption Failed',
      expect.stringContaining(
        'An error occurred: Encryption failed: Test qpdf error'
      )
    );

    consoleErrorSpy.mockRestore();
  });
});
