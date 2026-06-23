import { describe, it, expect, beforeEach } from 'vitest';
import { getSavedTemplateNames } from '../../js/workflow/serialization';
import type { SerializedWorkflow } from '../../js/workflow/types';

describe('Workflow Serialization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getSavedTemplateNames', () => {
    it('returns an empty array when localStorage is empty', () => {
      expect(getSavedTemplateNames()).toEqual([]);
    });

    it('returns array of keys when templates are present', () => {
      const mockTemplates: Record<string, SerializedWorkflow> = {
        'Template 1': { version: 1, nodes: [], connections: [] },
        'My Cool Workflow': { version: 1, nodes: [], connections: [] },
      };

      localStorage.setItem(
        'bento-pdf-workflow-templates',
        JSON.stringify(mockTemplates)
      );

      const names = getSavedTemplateNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('Template 1');
      expect(names).toContain('My Cool Workflow');
    });

    it('returns an empty array if JSON is invalid', () => {
      localStorage.setItem('bento-pdf-workflow-templates', 'invalid-json');
      expect(getSavedTemplateNames()).toEqual([]);
    });
  });
});
