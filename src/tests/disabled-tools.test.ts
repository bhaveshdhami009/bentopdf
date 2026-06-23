import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('disabled-tools utils', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('__DISABLED_TOOLS__', ['initial-disabled-tool']);
    vi.stubGlobal('fetch', vi.fn());
    // mock window.location
    delete (window as any).location;
    window.location = { pathname: '' } as any;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isToolDisabled', () => {
    it('returns true for tools in __DISABLED_TOOLS__', async () => {
      const { isToolDisabled } = await import('../js/utils/disabled-tools');
      expect(isToolDisabled('initial-disabled-tool')).toBe(true);
      expect(isToolDisabled('other-tool')).toBe(false);
    });
  });

  describe('getToolIdFromPath', () => {
    it('extracts toolId from html path', async () => {
      window.location.pathname = '/my-tool.html';
      const { getToolIdFromPath } = await import('../js/utils/disabled-tools');
      expect(getToolIdFromPath()).toBe('my-tool');
    });

    it('extracts toolId from dir path with trailing slash', async () => {
      window.location.pathname = '/my-tool/';
      const { getToolIdFromPath } = await import('../js/utils/disabled-tools');
      expect(getToolIdFromPath()).toBe('my-tool');
    });

    it('extracts toolId from dir path without trailing slash', async () => {
      window.location.pathname = '/my-tool';
      const { getToolIdFromPath } = await import('../js/utils/disabled-tools');
      expect(getToolIdFromPath()).toBe('my-tool');
    });

    it('returns null if path cannot be matched', async () => {
      window.location.pathname = '/';
      const { getToolIdFromPath } = await import('../js/utils/disabled-tools');
      // The current implementation `/([^/]+)\/?$/` matches any string that doesn't contain a slash, followed by optional slash.
      // Wait, let's see what it actually matches for '/'.
      // If path is '/', `match(/\/([^/]+)\/?$/)` returns null.
      expect(getToolIdFromPath()).toBeNull();
    });
  });

  describe('getEditorDisabledCategories', () => {
    it('returns empty array initially', async () => {
      const { getEditorDisabledCategories } =
        await import('../js/utils/disabled-tools');
      expect(getEditorDisabledCategories()).toEqual([]);
    });
  });

  describe('isCurrentPageDisabled', () => {
    it('returns true if the extracted toolId is disabled', async () => {
      window.location.pathname = '/initial-disabled-tool.html';
      const { isCurrentPageDisabled } =
        await import('../js/utils/disabled-tools');
      expect(isCurrentPageDisabled()).toBe(true);
    });

    it('returns false if the extracted toolId is not disabled', async () => {
      window.location.pathname = '/other-tool.html';
      const { isCurrentPageDisabled } =
        await import('../js/utils/disabled-tools');
      expect(isCurrentPageDisabled()).toBe(false);
    });

    it('returns false if toolId is null', async () => {
      window.location.pathname = '/';
      const { isCurrentPageDisabled } =
        await import('../js/utils/disabled-tools');
      expect(isCurrentPageDisabled()).toBe(false);
    });
  });

  describe('loadRuntimeConfig', () => {
    it('does not load config twice', async () => {
      const { loadRuntimeConfig } = await import('../js/utils/disabled-tools');
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ disabledTools: ['dynamic-tool'] }),
      });
      vi.stubGlobal('fetch', fetchSpy);

      await loadRuntimeConfig();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      await loadRuntimeConfig();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // not called again
    });

    it('adds disabled tools from config', async () => {
      const { loadRuntimeConfig, isToolDisabled } =
        await import('../js/utils/disabled-tools');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ disabledTools: ['dynamic-tool'] }),
        })
      );

      await loadRuntimeConfig();

      expect(isToolDisabled('initial-disabled-tool')).toBe(true); // still there
      expect(isToolDisabled('dynamic-tool')).toBe(true);
    });

    it('adds editor disabled categories from config', async () => {
      const { loadRuntimeConfig, getEditorDisabledCategories } =
        await import('../js/utils/disabled-tools');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ editorDisabledCategories: ['category1'] }),
        })
      );

      await loadRuntimeConfig();

      expect(getEditorDisabledCategories()).toEqual(['category1']);
    });

    it('handles fetch error gracefully', async () => {
      const { loadRuntimeConfig, getEditorDisabledCategories } =
        await import('../js/utils/disabled-tools');
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error'))
      );

      await loadRuntimeConfig();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LOAD_RUNTIME_CONFIG] Skipped runtime config:',
        expect.any(Error)
      );
      consoleWarnSpy.mockRestore();
    });

    it('ignores non-ok responses', async () => {
      const { loadRuntimeConfig } = await import('../js/utils/disabled-tools');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
        })
      );

      await loadRuntimeConfig();
      // Should not throw or do anything
    });

    it('ignores non-JSON responses', async () => {
      const { loadRuntimeConfig } = await import('../js/utils/disabled-tools');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          headers: new Headers({ 'content-type': 'text/html' }),
        })
      );

      await loadRuntimeConfig();
      // Should not throw or do anything
    });
  });
});
