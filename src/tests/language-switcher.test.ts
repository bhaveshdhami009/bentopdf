import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLanguageSwitcher } from '@/js/i18n/language-switcher';
import * as i18n from '@/js/i18n/i18n';

// Mock the i18n module
vi.mock('@/js/i18n/i18n', () => ({
  supportedLanguages: ['en', 'fr', 'es'],
  languageNames: {
    en: 'English',
    fr: 'Français',
    es: 'Español',
  },
  getLanguageFromUrl: vi.fn(),
  changeLanguage: vi.fn(),
  t: vi.fn((key) => key),
}));

describe('createLanguageSwitcher', () => {
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(i18n.getLanguageFromUrl).mockReturnValue('en');

    // Mock requestAnimationFrame for focus
    originalRequestAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = vi.fn((cb) => {
      cb(0);
      return 0;
    });

    // Clear document body
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it('should create the basic DOM structure', () => {
    const switcher = createLanguageSwitcher();

    expect(switcher.tagName).toBe('DIV');
    expect(switcher.id).toBe('language-switcher');
    expect(switcher.className).toContain('relative');

    const button = switcher.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-haspopup')).toBe('true');
    expect(button?.getAttribute('aria-expanded')).toBe('false');

    const textSpan = button?.querySelector('span');
    expect(textSpan?.textContent).toBe('English');

    const dropdown = switcher.querySelector('div[role="menu"]');
    expect(dropdown).not.toBeNull();
    expect(dropdown?.classList.contains('hidden')).toBe(true);
  });

  it('should render supported language options', () => {
    const switcher = createLanguageSwitcher();
    const dropdown = switcher.querySelector('div[role="menu"]');
    const options = dropdown?.querySelectorAll('button[role="menuitem"]');

    expect(options?.length).toBe(3);

    const enOption = Array.from(options || []).find(
      (opt) => (opt as HTMLElement).dataset.lang === 'en'
    ) as HTMLElement;
    expect(enOption).toBeDefined();
    expect(enOption.textContent).toBe('English');
    expect(enOption.classList.contains('bg-gray-700')).toBe(true); // Current language

    const frOption = Array.from(options || []).find(
      (opt) => (opt as HTMLElement).dataset.lang === 'fr'
    ) as HTMLElement;
    expect(frOption).toBeDefined();
    expect(frOption.textContent).toBe('Français');
    expect(frOption.classList.contains('bg-gray-700')).toBe(false);
  });

  it('should toggle dropdown visibility when main button is clicked', () => {
    const switcher = createLanguageSwitcher();
    const button = switcher.querySelector('button') as HTMLButtonElement;
    const dropdown = switcher.querySelector('div[role="menu"]') as HTMLElement;

    // Initial state
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(dropdown.classList.contains('hidden')).toBe(true);

    // Open dropdown
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(dropdown.classList.contains('hidden')).toBe(false);
    expect(window.requestAnimationFrame).toHaveBeenCalled();

    // Close dropdown
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(dropdown.classList.contains('hidden')).toBe(true);
  });

  it('should close dropdown when clicking outside', () => {
    const switcher = createLanguageSwitcher();
    document.body.appendChild(switcher);

    const button = switcher.querySelector('button') as HTMLButtonElement;
    const dropdown = switcher.querySelector('div[role="menu"]') as HTMLElement;

    // Open dropdown
    button.click();
    expect(dropdown.classList.contains('hidden')).toBe(false);

    // Click outside
    document.dispatchEvent(new MouseEvent('click'));

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(dropdown.classList.contains('hidden')).toBe(true);
  });

  it('should close dropdown when Escape is pressed in search input', () => {
    const switcher = createLanguageSwitcher();
    const button = switcher.querySelector('button') as HTMLButtonElement;
    const dropdown = switcher.querySelector('div[role="menu"]') as HTMLElement;
    const searchInput = switcher.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement;

    // Open dropdown
    button.click();
    expect(dropdown.classList.contains('hidden')).toBe(false);

    // Press Escape
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    searchInput.dispatchEvent(event);

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(dropdown.classList.contains('hidden')).toBe(true);
  });

  it('should call changeLanguage when an option is clicked', () => {
    const switcher = createLanguageSwitcher();
    const frOption = switcher.querySelector(
      'button[data-lang="fr"]'
    ) as HTMLButtonElement;

    frOption.click();

    expect(i18n.changeLanguage).toHaveBeenCalledWith('fr');
  });

  it('should not call changeLanguage if current language is clicked', () => {
    const switcher = createLanguageSwitcher();
    const enOption = switcher.querySelector(
      'button[data-lang="en"]'
    ) as HTMLButtonElement;

    enOption.click();

    expect(i18n.changeLanguage).not.toHaveBeenCalled();
  });

  it('should filter language options based on search input', () => {
    const switcher = createLanguageSwitcher();
    const searchInput = switcher.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement;
    const options = switcher.querySelectorAll('button[role="menuitem"]');
    const emptyState = switcher.querySelector('p.text-center') as HTMLElement;

    // Type "fra"
    searchInput.value = 'fra';
    searchInput.dispatchEvent(new Event('input'));

    const enOption = Array.from(options).find(
      (opt) => (opt as HTMLElement).dataset.lang === 'en'
    ) as HTMLElement;
    const frOption = Array.from(options).find(
      (opt) => (opt as HTMLElement).dataset.lang === 'fr'
    ) as HTMLElement;

    expect(enOption.classList.contains('hidden')).toBe(true);
    expect(frOption.classList.contains('hidden')).toBe(false);
    expect(emptyState.classList.contains('hidden')).toBe(true);

    // Type "xyz" (no match)
    searchInput.value = 'xyz';
    searchInput.dispatchEvent(new Event('input'));

    expect(enOption.classList.contains('hidden')).toBe(true);
    expect(frOption.classList.contains('hidden')).toBe(true);
    expect(emptyState.classList.contains('hidden')).toBe(false);
  });
});
