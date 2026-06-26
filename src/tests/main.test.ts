import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../js/ui.js', () => ({
  dom: {},
  switchView: vi.fn(),
  hideAlert: vi.fn(),
}));

vi.mock('../js/logic/shortcuts.js', () => ({
  ShortcutsManager: { init: vi.fn() },
}));

vi.mock('lucide', () => ({
  createIcons: vi.fn(),
  icons: {},
}));

vi.mock('@phosphor-icons/web/regular', () => ({}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
}));

vi.mock('../js/utils/helpers.js', () => ({
  escapeHtml: vi.fn(),
  formatShortcutDisplay: vi.fn(),
  formatStars: vi.fn((num) => `${num}k`),
}));

vi.mock('../js/i18n/index.js', () => ({
  initI18n: vi.fn().mockResolvedValue(true),
  applyTranslations: vi.fn(),
  rewriteLinks: vi.fn(),
  injectLanguageSwitcher: vi.fn(),
  t: vi.fn(),
}));

vi.mock('../js/utils/disabled-tools.js', () => ({
  loadRuntimeConfig: vi.fn().mockResolvedValue(true),
  isToolDisabled: vi.fn().mockReturnValue(false),
  isCurrentPageDisabled: vi.fn().mockReturnValue(false),
}));

describe('main initialization error fallback', () => {
  let originalFetch: any;
  let originalSimpleMode: any;
  let originalBrandName: any;

  beforeEach(() => {
    // Save globals
    originalFetch = global.fetch;
    originalSimpleMode = (global as any).__SIMPLE_MODE__;
    originalBrandName = (global as any).__BRAND_NAME__;

    // Reset document
    document.body.innerHTML = `
      <div id="github-stars-desktop"></div>
      <div id="github-stars-mobile"></div>
      <main></main>
    `;

    // Reset module registry so main.ts re-executes
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (global as any).__SIMPLE_MODE__ = originalSimpleMode;
    (global as any).__BRAND_NAME__ = originalBrandName;
    vi.restoreAllMocks();
  });

  it('should fallback to "-" when fetch fails', async () => {
    (global as any).__SIMPLE_MODE__ = false;
    (global as any).__BRAND_NAME__ = 'Test';

    // Mock fetch to reject
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    // Import main.ts
    await import('../js/main');

    // Trigger window load event to fire init()
    window.dispatchEvent(new Event('load'));

    // Wait for the async init function to resolve its microtasks
    await new Promise((resolve) => setTimeout(resolve, 50));

    const desktopEl = document.getElementById('github-stars-desktop');
    const mobileEl = document.getElementById('github-stars-mobile');

    expect(desktopEl?.textContent).toBe('-');
    expect(mobileEl?.textContent).toBe('-');
  });

  it('should fetch and format stars on success', async () => {
    (global as any).__SIMPLE_MODE__ = false;
    (global as any).__BRAND_NAME__ = 'Test';

    // Mock fetch to resolve
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ stargazers_count: 1200 }),
    });

    // Import main.ts
    await import('../js/main');

    // Trigger window load event to fire init()
    window.dispatchEvent(new Event('load'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const desktopEl = document.getElementById('github-stars-desktop');
    const mobileEl = document.getElementById('github-stars-mobile');

    expect(desktopEl?.textContent).toBe('1200k');
    expect(mobileEl?.textContent).toBe('1200k');
  });

  it('should skip fetch logic if simple mode is enabled', async () => {
    (global as any).__SIMPLE_MODE__ = true;
    (global as any).__BRAND_NAME__ = 'Test';

    global.fetch = vi.fn();

    await import('../js/main');

    // Trigger window load event to fire init()
    window.dispatchEvent(new Event('load'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
