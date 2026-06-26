import { describe, it, expect, vi, afterEach } from 'vitest';
import { wfError } from '../../js/workflow/errors';
import { t } from '../../js/i18n/i18n';

vi.mock('../../js/i18n/i18n', () => ({
  t: vi.fn(),
}));

describe('wfError', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call t with the correct key prefix', () => {
    vi.mocked(t).mockReturnValue('Translated Error');

    const result = wfError('missingNode');

    expect(t).toHaveBeenCalledWith(
      'tools:pdfWorkflow.errors.missingNode',
      undefined
    );
    expect(result).toBe('Translated Error');
  });

  it('should pass params to the translation function', () => {
    vi.mocked(t).mockReturnValue('Translated Error with Params');

    const params = { nodeType: 'Filter' };
    const result = wfError('invalidType', params);

    expect(t).toHaveBeenCalledWith(
      'tools:pdfWorkflow.errors.invalidType',
      params
    );
    expect(result).toBe('Translated Error with Params');
  });
});
