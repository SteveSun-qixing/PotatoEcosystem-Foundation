/**
 * 网络通信模块集成测试
 * @module tests/integration/network-integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheManager, ProtocolAdapter } from '../../src';

describe('网络通信模块集成测试', () => {
  describe('CacheManager + ProtocolAdapter 集成', () => {
    let cacheManager: CacheManager<string>;
    let protocolAdapter: ProtocolAdapter;

    beforeEach(() => {
      cacheManager = new CacheManager<string>({
        maxEntries: 100,
        ttl: 60000,
        evictionPolicy: 'lru',
      });
      protocolAdapter = new ProtocolAdapter();
    });

    it('应该能够缓存协议请求结果', async () => {
      const testUrl = 'data:text/plain;base64,' + btoa('Hello, World!');

      // 第一次请求（无缓存）
      let cached = cacheManager.get(testUrl);
      expect(cached).toBeUndefined();

      // 发起请求（使用内置的 data URL 处理器）
      const response = await protocolAdapter.fetch({ url: testUrl });

      // 获取文本数据
      const text =
        typeof response.data === 'string'
          ? response.data
          : new TextDecoder().decode(response.data);

      // 缓存结果
      cacheManager.set(testUrl, text);

      // 第二次获取（从缓存）
      cached = cacheManager.get(testUrl);
      expect(cached).toBe('Hello, World!');
    });

    it('应该能够使用 getOrSet 模式', async () => {
      let fetchCount = 0;

      const result = await cacheManager.getOrSet('test-key', async () => {
        fetchCount++;
        return 'fetched-value';
      });

      expect(result).toBe('fetched-value');
      expect(fetchCount).toBe(1);

      // 再次调用应该使用缓存
      const result2 = await cacheManager.getOrSet('test-key', async () => {
        fetchCount++;
        return 'new-value';
      });

      expect(result2).toBe('fetched-value');
      expect(fetchCount).toBe(1); // 仍然是 1，说明使用了缓存
    });
  });

  describe('CacheManager 策略测试', () => {
    it('应该正确执行 LRU 淘汰', async () => {
      const cache = new CacheManager<string>({
        maxEntries: 3,
        evictionPolicy: 'lru',
      });

      cache.set('a', '1');
      // 添加延迟确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.set('b', '2');
      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.set('c', '3');

      // 访问 'a'，使其成为最近使用
      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.get('a');

      // 添加新项，应该淘汰 'b'（最久未使用）
      cache.set('d', '4');

      expect(cache.get('a')).toBe('1'); // 最近访问过
      expect(cache.get('b')).toBeUndefined(); // 被淘汰
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });

    it('应该正确执行 FIFO 淘汰', async () => {
      const cache = new CacheManager<string>({
        maxEntries: 3,
        evictionPolicy: 'fifo',
      });

      cache.set('a', '1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.set('b', '2');
      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.set('c', '3');

      // 添加新项，应该淘汰 'a'（最先进入）
      cache.set('d', '4');

      expect(cache.get('a')).toBeUndefined(); // 被淘汰
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });

    it('应该正确处理 TTL 过期', async () => {
      const cache = new CacheManager<string>({
        ttl: 50, // 50ms 过期
      });

      cache.set('key', 'value');
      expect(cache.get('key')).toBe('value');

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.get('key')).toBeUndefined();
    });
  });

  describe('ProtocolAdapter 自定义协议', () => {
    it('应该能够注册和使用自定义协议', async () => {
      const adapter = new ProtocolAdapter();

      // 注册 chips 协议（ProtocolType 不包含冒号）
      adapter.registerHandler('chips', async (request) => {
        const path = request.url.replace('chips://', '');
        return {
          data: JSON.stringify({ path, type: 'chips-resource' }),
          mimeType: 'application/json',
          status: 200,
        };
      });

      const response = await adapter.fetch({ url: 'chips://card/abc123' });
      const data = JSON.parse(response.data as string);

      expect(data.path).toBe('card/abc123');
      expect(data.type).toBe('chips-resource');
    });

    it('应该能够检查协议支持', () => {
      const adapter = new ProtocolAdapter();

      // 使用 isSupported 方法（不是 supports）
      expect(adapter.isSupported('http://example.com')).toBe(true);
      expect(adapter.isSupported('https://example.com')).toBe(true);
      expect(adapter.isSupported('data:text/plain;base64,dGVzdA==')).toBe(true);
      // file 协议默认未注册
      expect(adapter.isSupported('file://test')).toBe(false);

      // 注册 file 协议处理器
      adapter.registerHandler('file', async (request) => ({
        data: '',
        mimeType: 'text/plain',
        status: 200,
      }));
      expect(adapter.isSupported('file://test')).toBe(true);
    });
  });
});
