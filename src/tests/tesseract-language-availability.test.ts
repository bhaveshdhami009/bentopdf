import { describe, expect, it } from 'vitest';
import { UnsupportedOcrLanguageError } from '../js/utils/tesseract-language-availability';

describe('UnsupportedOcrLanguageError', () => {
  it('correctly formats the error message and properties', () => {
    const error = new UnsupportedOcrLanguageError(
      ['fra', 'jpn'],
      ['eng', 'deu']
    );

    expect(error.name).toBe('UnsupportedOcrLanguageError');
    expect(error.unavailableLanguages).toEqual(['fra', 'jpn']);
    expect(error.availableLanguages).toEqual(['eng', 'deu']);
    expect(error.message).toBe(
      'This BentoPDF build only bundles OCR data for English (eng), German (deu). ' +
        'The requested OCR language is not available: French (fra), Japanese (jpn). ' +
        'Choose one of the bundled languages or rebuild the air-gapped bundle with the missing language added to --ocr-languages.'
    );
  });
});
