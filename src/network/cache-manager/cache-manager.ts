/**
 * CacheManager 缓存管理器
 * @module @chips/foundation/network/cache-manager/cache-manager
 */

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  /** 数据 */
  data: T;
  /** 过期时间 */
  expiresAt: number;
  /** 创建时间 */
  createdAt: number;
  /** 访问次数 */
  hits: number;
  /** 最后访问时间 */
  lastAccess: number;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** TTL（毫秒） */
  ttl?: number;
  /** 最大条目数 */
  maxEntries?: number;
  /** 淘汰策略 */
  evictionPolicy?: 'lru' | 'fifo' | 'lfu';
}

/**
 * CacheManager 缓存管理器
 */
export class CacheManager<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;
  private maxEntries: number;
  private evictionPolicy: 'lru' | 'fifo' | 'lfu';

  constructor(options?: CacheOptions) {
    this.defaultTTL = options?.ttl ?? 5 * 60 * 1000; // 默认5分钟
    this.maxEntries = options?.maxEntries ?? 1000;
    this.evictionPolicy = options?.evictionPolicy ?? 'lru';
  }

  /**
   * 获取缓存
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // 更新访问信息
    entry.hits++;
    entry.lastAccess = Date.now();

    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(key: string, data: T, ttl?: number): void {
    // 检查是否需要淘汰
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evict();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + (ttl ?? this.defaultTTL),
      createdAt: now,
      hits: 0,
      lastAccess: now,
    });
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 检查是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取或设置（带工厂函数）
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 淘汰条目
   */
  private evict(): void {
    if (this.cache.size === 0) {
      return;
    }

    let keyToEvict: string | undefined;

    switch (this.evictionPolicy) {
      case 'lru':
        // 淘汰最久未访问的
        let oldestAccess = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.lastAccess < oldestAccess) {
            oldestAccess = entry.lastAccess;
            keyToEvict = key;
          }
        }
        break;

      case 'fifo':
        // 淘汰最早创建的
        let oldestCreated = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.createdAt < oldestCreated) {
            oldestCreated = entry.createdAt;
            keyToEvict = key;
          }
        }
        break;

      case 'lfu':
        // 淘汰访问次数最少的
        let minHits = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.hits < minHits) {
            minHits = entry.hits;
            keyToEvict = key;
          }
        }
        break;
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  /**
   * 获取统计信息
   */
  stats(): {
    size: number;
    maxEntries: number;
    policy: string;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      policy: this.evictionPolicy,
      keys: this.keys(),
    };
  }
}

/**
 * 全局缓存管理器实例
 */
export const cacheManager = new CacheManager();
