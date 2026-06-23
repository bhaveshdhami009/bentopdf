import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Worker BEFORE anything is imported, as 'heic2any' tries to access it on module load
vi.stubGlobal(
  'Worker',
  vi.fn().mockImplementation(() => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
  }))
);

import { deleteTemplate } from '../js/workflow/serialization';

describe('serialization', () => {
  const TEMPLATES_KEY = 'bento-pdf-workflow-templates';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('deleteTemplate', () => {
    it('should delete a template from localStorage', () => {
      // Arrange: set up localStorage with dummy templates
      const dummyTemplates = {
        template1: { version: 1, nodes: [] as any[], connections: [] as any[] },
        template2: { version: 1, nodes: [] as any[], connections: [] as any[] },
      };
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(dummyTemplates));

      // Act: delete one of the templates
      deleteTemplate('template1');

      // Assert: verify the item is removed
      const stored = localStorage.getItem(TEMPLATES_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual({
        template2: { version: 1, nodes: [], connections: [] },
      });
      expect(parsed['template1']).toBeUndefined();
    });

    it('should handle deleting a non-existent template gracefully', () => {
      // Arrange: set up localStorage with dummy templates
      const dummyTemplates = {
        template1: { version: 1, nodes: [] as any[], connections: [] as any[] },
      };
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(dummyTemplates));

      // Act: delete a template that doesn't exist
      deleteTemplate('non-existent');

      // Assert: verify the existing templates are untouched
      const stored = localStorage.getItem(TEMPLATES_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual({
        template1: { version: 1, nodes: [], connections: [] },
      });
    });

    it('should handle empty localStorage gracefully', () => {
      // Arrange: empty localStorage
      localStorage.clear();

      // Act: delete a template
      deleteTemplate('template1');

      // Assert: verify an empty object was saved
      const stored = localStorage.getItem(TEMPLATES_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual({});
    });
  });
});
