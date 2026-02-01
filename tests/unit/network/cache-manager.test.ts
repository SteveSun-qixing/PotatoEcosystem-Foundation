/**
 * CacheManager 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../../../src/network/cache-manager';

describe('CacheManager', () => {
  let cache: CacheManager<string>;

  beforeEach(() => {
    cache = new CacheManager<string>({ ttl: 1000, maxEntries: 10 });
  });

  describe('get/set', () => {
    it('should set and get value', () => {
      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should expire after TTL', async () => {
      cache.set('key', 'value', 50);
      expect(cache.get('key')).toBe('value');

      await new Promise((r) => setTimeout(r, 60));
      expect(cache.get('key')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.has('key')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('getOrSet', () => {
    it('should return cached value', async () => {
      cache.set('key', 'cached');
      const factory = vi.fn().mockResolvedValue('new');
      const result = await cache.getOrSet('key', factory);
      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result', async () => {
      const factory = vi.fn().mockResolvedValue('new');
      const result = await cache.getOrSet('key', factory);
      expect(result).toBe('new');
      expect(factory).toHaveBeenCalled();
      expect(cache.get('key')).toBe('new');
    });
  });

  describe('eviction', () => {
    it('should evict when max entries reached', () => {
      const smallCache = new CacheManager<string>({
        maxEntries: 2,
        evictionPolicy: 'fifo',
      });

      smallCache.set('a', '1');
      smallCache.set('b', '2');

      // 添加新条目，应该淘汰最早的
      smallCache.set('c', '3');

      expect(smallCache.size()).toBe(2);
      expect(smallCache.has('c')).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('short', 'value', 50);
      cache.set('long', 'value', 5000);

      await new Promise((r) => setTimeout(r, 60));

      const cleaned = cache.cleanup();
      expect(cleaned).toBe(1);
      expect(cache.has('short')).toBe(false);
      expect(cache.has('long')).toBe(true);
    });
  });
});
