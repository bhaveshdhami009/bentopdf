import { describe, expect, it, vi } from 'vitest';
import { extractPageModel } from '@/js/compare/engine/extract-page-model.ts';

describe('extractPageModel', () => {
  it('handles font resolution errors gracefully', async () => {
    const mockPage = {
      getTextContent: vi.fn().mockResolvedValue({
        items: [{ fontName: 'g_d0_f1' }],
        styles: {},
      }),
      getAnnotations: vi.fn().mockResolvedValue([]),
      getOperatorList: vi
        .fn()
        .mockResolvedValue({ fnArray: [], argsArray: [] }),
      commonObjs: {
        has: vi.fn().mockReturnValue(true),
        get: vi.fn().mockImplementation(() => {
          throw new Error('Test error resolving font');
        }),
      },
      pageNumber: 1,
    } as any;

    const mockViewport = {
      width: 800,
      height: 600,
      transform: [1, 0, 0, 1, 0, 0],
      scale: 1,
    } as any;

    // Spy on console.warn
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await extractPageModel(mockPage, mockViewport);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to resolve font name for "g_d0_f1"',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
