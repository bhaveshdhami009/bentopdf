import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../../js/compare/lru-cache';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  it('should initialize empty with 0 size', () => {
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.has('a')).toBe(false);
  });

  it('should set and get values', () => {
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.size).toBe(1);
    expect(cache.has('a')).toBe(true);
  });

  it('should update existing keys with new values', () => {
    cache.set('a', 1);
    cache.set('a', 2);
    expect(cache.get('a')).toBe(2);
    expect(cache.size).toBe(1);
  });

  it('should evict the least recently used item when capacity is exceeded', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Cache is now full. Add one more item.
    cache.set('d', 4);

    // 'a' was the least recently used, so it should be evicted
    expect(cache.has('a')).toBe(false);
    expect(cache.get('a')).toBeUndefined();

    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
    expect(cache.size).toBe(3);
  });

  it('get() should update the LRU order', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a', making it the most recently used
    expect(cache.get('a')).toBe(1);

    // Add new item, which should evict 'b' (the new least recently used)
    cache.set('d', 4);

    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('set() on existing key should update the LRU order', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Update 'a', making it the most recently used
    cache.set('a', 10);

    // Add new item, which should evict 'b'
    cache.set('d', 4);

    expect(cache.has('b')).toBe(false);
    expect(cache.get('a')).toBe(10);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('should correctly clear the cache', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(false);
    expect(cache.get('a')).toBeUndefined();
  });
});
