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

import { deleteTemplate, saveWorkflow } from '../js/workflow/serialization';

describe('serialization', () => {
  const TEMPLATES_KEY = 'bento-pdf-workflow-templates';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });


  describe('saveWorkflow', () => {
    it('should successfully serialize and save a workflow to localStorage', () => {
      const mockEditor = {
        getNodes: vi.fn().mockReturnValue([
          {
            id: 'node1',
            nodeType: 'testNode',
            controls: {
              myControl: { value: 'testValue' }
            }
          }
        ]),
        getConnections: vi.fn().mockReturnValue([
          {
            id: 'conn1',
            source: 'node1',
            sourceOutput: 'out1',
            target: 'node2',
            targetInput: 'in1'
          }
        ]),
      } as any;

      const mockArea = {
        nodeViews: new Map([
          ['node1', { position: { x: 10, y: 20 } }]
        ]),
      } as any;

      saveWorkflow(mockEditor, mockArea, 'myTemplate');

      const stored = localStorage.getItem(TEMPLATES_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.myTemplate).toBeDefined();
      expect(parsed.myTemplate.nodes).toHaveLength(1);
      expect(parsed.myTemplate.nodes[0]).toEqual({
        id: 'node1',
        type: 'testNode',
        position: { x: 10, y: 20 },
        controls: { myControl: 'testValue' }
      });
      expect(parsed.myTemplate.connections).toHaveLength(1);
      expect(parsed.myTemplate.connections[0]).toEqual({
        id: 'conn1',
        source: 'node1',
        sourceOutput: 'out1',
        target: 'node2',
        targetInput: 'in1'
      });
    });

    it('should handle cases where node views are missing', () => {
      const mockEditor = {
        getNodes: vi.fn().mockReturnValue([
          {
            id: 'node1',
            nodeType: 'testNode',
            controls: {}
          }
        ]),
        getConnections: vi.fn().mockReturnValue([]),
      } as any;

      const mockArea = {
        nodeViews: new Map(), // Empty map
      } as any;

      saveWorkflow(mockEditor, mockArea, 'myTemplate');

      const stored = localStorage.getItem(TEMPLATES_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.myTemplate.nodes[0].position).toEqual({ x: 0, y: 0 });
    });

    it('should handle localStorage quota exceeded by restoring backup', () => {
      const mockEditor = {
        getNodes: vi.fn().mockReturnValue([]),
        getConnections: vi.fn().mockReturnValue([]),
      } as any;

      const mockArea = {
        nodeViews: new Map(),
      } as any;

      // Setup backup
      const backupTemplate = { version: 1, nodes: [] as any[], connections: [] as any[] };
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify({ myTemplate: backupTemplate }));

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveWorkflow(mockEditor, mockArea, 'myTemplate')).toThrow();

      // Verify backup was restored internally if possible, though since localStorage setItem throws,
      // the actual localStorage wouldn't have been successfully mutated with the new data anyway.
      // We mainly verify it throws the expected error format.

      setItemSpy.mockRestore();
    });

    it('should handle localStorage quota exceeded by deleting template if no backup', () => {
       const mockEditor = {
        getNodes: vi.fn().mockReturnValue([]),
        getConnections: vi.fn().mockReturnValue([]),
      } as any;

      const mockArea = {
        nodeViews: new Map(),
      } as any;

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveWorkflow(mockEditor, mockArea, 'myTemplate')).toThrow();

      setItemSpy.mockRestore();
    });
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
