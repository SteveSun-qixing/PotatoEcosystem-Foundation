/**
 * ResourceManager - 资源管理器
 * @module @chips/foundation/resource/resource-manager
 *
 * 薯片公共基础层的核心资源服务提供者。
 *
 * 职责：
 * - 卡片挂载/卸载（管理已打开的卡片及其资源）
 * - 按需加载资源（从 ZIP 按需提取，LRU 缓存）
 * - 支持多种资源加载策略（直接读取、解压到工作区、网络、本地链接）
 * - MIME 类型推断
 * - 挂载表永久存储（通过 MountStore）
 *
 * 架构定位：
 * - 作为内核的服务提供者模块，处理 resource.load 请求
 * - 内核路由到此模块后，根据 cardId 和 resourcePath 返回资源数据
 * - SDK ResourceManager 是客户端封装，委托实际操作到这里
 */

import type JSZip from 'jszip';
import { MountStore } from './mount-store';
import type {
  MountSource,
  MountOptions,
  MountResult,
  MountRecord,
  ResourceData,
  ResourceMeta,
  ResourceEntry,
  ResourceCacheEntry,
  ResourceManagerOptions,
  ResourceStrategy,
  CacheConfig,
} from './types';

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024,   // 50MB
  maxEntries: 200,
  ttl: 30 * 60 * 1000,          // 30 分钟
};

/**
 * 已挂载卡片的运行时数据
 */
interface CardMountRuntime {
  /** 卡片 ID */
  cardId: string;
  /** 挂载源 */
  source: MountSource;
  /** 资源加载策略 */
  strategy: ResourceStrategy;
  /** JSZip 实例（direct-read 策略使用） */
  zipInstance: JSZip | null;
  /** 原始 ZIP 数据引用（zip-data 源使用） */
  zipData: Uint8Array | null;
  /** 资源文件索引：path -> { size } */
  fileIndex: Map<string, { size: number; isDirectory: boolean }>;
  /** 挂载时间 */
  mountedAt: string;
}

/**
 * 扩展名到 MIME 类型映射
 */
const EXTENSION_MIME_MAP: Record<string, string> = {
  // 图片
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif',
  // 视频
  mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg',
  mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  // 音频
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4', wma: 'audio/x-ms-wma',
  // 字体
  woff: 'font/woff', woff2: 'font/woff2',
  ttf: 'font/ttf', otf: 'font/otf',
  // 文本
  txt: 'text/plain', html: 'text/html', htm: 'text/html',
  css: 'text/css', js: 'text/javascript', json: 'application/json',
  xml: 'application/xml', yaml: 'application/x-yaml', yml: 'application/x-yaml',
  md: 'text/markdown', csv: 'text/csv',
  // 文档
  pdf: 'application/pdf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // 字幕
  srt: 'text/plain', vtt: 'text/vtt', ass: 'text/plain',
  // Chips
  card: 'application/x-chips-card', box: 'application/x-chips-box',
};

/**
 * 资源管理器
 *
 * @example
 * ```ts
 * const manager = new ResourceManager();
 * await manager.initialize();
 *
 * // 挂载卡片
 * await manager.mountCard('abc123', { type: 'zip-data', data: zipBuffer });
 *
 * // 加载资源
 * const resource = await manager.loadResource('abc123', 'photo.jpg');
 * console.log(resource.mimeType); // 'image/jpeg'
 *
 * // 卸载卡片
 * await manager.unmountCard('abc123');
 * ```
 */
export class ResourceManager {
  private _mountStore: MountStore;
  private _mounts: Map<string, CardMountRuntime> = new Map();
  private _cache: Map<string, ResourceCacheEntry> = new Map();
  private _cacheConfig: CacheConfig;
  private _currentCacheSize = 0;
  private _options: ResourceManagerOptions;

  constructor(options?: ResourceManagerOptions) {
    this._options = options ?? {};
    this._cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...options?.cache };
    this._mountStore = new MountStore(options?.mountDbPath);
  }

  /**
   * 初始化
   *
   * 从数据库文件恢复挂载表。注意：恢复的卡片不会自动加载 ZIP，
   * 只有在实际请求资源时才会按需加载（懒初始化）。
   */
  async initialize(): Promise<void> {
    await this._mountStore.initialize();
  }

  /**
   * 销毁
   *
   * 释放所有 ZIP 实例和缓存
   */
  async dispose(): Promise<void> {
    this._cache.clear();
    this._currentCacheSize = 0;

    for (const mount of this._mounts.values()) {
      mount.zipInstance = null;
      mount.zipData = null;
    }
    this._mounts.clear();
  }

  // ========== 卡片挂载 ==========

  /**
   * 挂载卡片
   *
   * 解析 ZIP 文件索引（不解压全部数据），记录到挂载表。
   */
  async mountCard(
    cardId: string,
    source: MountSource,
    options?: MountOptions
  ): Promise<MountResult> {
    const strategy = options?.strategy ?? 'direct-read';
    const persistent = options?.persistent ?? true;
    const now = new Date().toISOString();

    // 如果已挂载，先卸载
    if (this._mounts.has(cardId)) {
      await this.unmountCard(cardId);
    }

    // 加载 ZIP 并建立索引
    const { zipInstance, zipData, fileIndex, totalSize } =
      await this._loadZipAndIndex(source);

    const runtime: CardMountRuntime = {
      cardId,
      source,
      strategy,
      zipInstance,
      zipData,
      fileIndex,
      mountedAt: now,
    };

    this._mounts.set(cardId, runtime);

    const resourceCount = fileIndex.size;

    // 持久化
    if (persistent) {
      const record: MountRecord = {
        cardId,
        source: source.type === 'zip-data'
          ? { type: 'zip-data', data: new Uint8Array(0) } // 不持久化二进制数据
          : source,
        strategy,
        mountedAt: now,
        resourceCount,
        totalSize,
        lastAccessedAt: now,
      };
      await this._mountStore.addRecord(record);
    }

    return {
      cardId,
      resourceCount,
      totalSize,
      strategy,
      mountedAt: now,
    };
  }

  /**
   * 卸载卡片
   *
   * 释放 ZIP 实例，清理相关缓存，从挂载表移除。
   */
  async unmountCard(cardId: string): Promise<void> {
    const mount = this._mounts.get(cardId);
    if (mount) {
      mount.zipInstance = null;
      mount.zipData = null;
      this._mounts.delete(cardId);
    }

    // 清理该卡片的缓存
    this._evictCardCache(cardId);

    // 从持久化存储移除
    await this._mountStore.removeRecord(cardId);
  }

  // ========== 资源访问 ==========

  /**
   * 加载资源
   *
   * 按需从 ZIP 提取资源数据，带 LRU 缓存。
   */
  async loadResource(cardId: string, resourcePath: string): Promise<ResourceData> {
    const cacheKey = `${cardId}:${resourcePath}`;

    // 1. 检查缓存
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return {
        data: cached.data,
        mimeType: cached.mimeType,
        size: cached.size,
        path: resourcePath,
      };
    }

    // 2. 获取挂载运行时
    const mount = await this._ensureMountRuntime(cardId);
    if (!mount) {
      throw new Error(`Card not mounted: ${cardId}`);
    }

    // 3. 从 ZIP 提取
    if (!mount.zipInstance) {
      throw new Error(`ZIP instance not available for card: ${cardId}`);
    }

    const file = mount.zipInstance.file(resourcePath);
    if (!file) {
      throw new Error(`Resource not found in card ${cardId}: ${resourcePath}`);
    }

    const data = await file.async('uint8array');
    const mimeType = this._inferMimeType(resourcePath);

    // 4. 存入缓存
    this._addToCache(cacheKey, data, mimeType);

    // 5. 更新最后访问时间
    await this._mountStore.updateLastAccess(cardId);

    return {
      data,
      mimeType,
      size: data.byteLength,
      path: resourcePath,
    };
  }

  /**
   * 获取资源元信息
   */
  async getResourceInfo(cardId: string, resourcePath: string): Promise<ResourceMeta> {
    const mount = await this._ensureMountRuntime(cardId);
    if (!mount) {
      return { path: resourcePath, size: 0, mimeType: '', exists: false };
    }

    const entry = mount.fileIndex.get(resourcePath);
    if (!entry) {
      return { path: resourcePath, size: 0, mimeType: '', exists: false };
    }

    return {
      path: resourcePath,
      size: entry.size,
      mimeType: this._inferMimeType(resourcePath),
      exists: true,
    };
  }

  /**
   * 检查资源是否存在
   */
  async resourceExists(cardId: string, resourcePath: string): Promise<boolean> {
    const mount = await this._ensureMountRuntime(cardId);
    if (!mount) return false;
    return mount.fileIndex.has(resourcePath);
  }

  /**
   * 列出卡片所有资源
   */
  async listResources(cardId: string): Promise<ResourceEntry[]> {
    const mount = await this._ensureMountRuntime(cardId);
    if (!mount) return [];

    const entries: ResourceEntry[] = [];
    for (const [path, info] of mount.fileIndex) {
      entries.push({
        path,
        size: info.size,
        isDirectory: info.isDirectory,
      });
    }
    return entries;
  }

  // ========== 挂载表查询 ==========

  /**
   * 获取所有已挂载卡片的记录
   */
  getMountedCards(): MountRecord[] {
    return this._mountStore.getAllRecords();
  }

  /**
   * 检查卡片是否已挂载
   */
  isMounted(cardId: string): boolean {
    return this._mounts.has(cardId) || this._mountStore.hasRecord(cardId);
  }

  /**
   * 获取挂载信息
   */
  getMountInfo(cardId: string): MountRecord | undefined {
    return this._mountStore.getRecord(cardId);
  }

  // ========== 缓存管理 ==========

  /**
   * 清理所有缓存
   */
  clearCache(): void {
    this._cache.clear();
    this._currentCacheSize = 0;
  }

  // ========== 私有方法 ==========

  /**
   * 加载 ZIP 并建立文件索引
   */
  private async _loadZipAndIndex(source: MountSource): Promise<{
    zipInstance: JSZip;
    zipData: Uint8Array | null;
    fileIndex: Map<string, { size: number; isDirectory: boolean }>;
    totalSize: number;
  }> {
    // 动态导入 JSZip（避免顶层 import 影响无需 ZIP 功能的使用者）
    const JSZipModule = await import('jszip');
    const JSZipClass = JSZipModule.default;

    let zipInstance: JSZip;
    let zipData: Uint8Array | null = null;

    if (source.type === 'zip-data') {
      zipData = source.data;
      zipInstance = await JSZipClass.loadAsync(source.data);
    } else if (source.type === 'zip-path') {
      // 通过 Node.js fs 读取文件
      const buffer = await this._readFileFromDisk(source.path);
      zipData = buffer;
      zipInstance = await JSZipClass.loadAsync(buffer);
    } else if (source.type === 'directory') {
      // 文件夹模式：不使用 ZIP，创建空 ZIP 实例
      // 实际资源直接从文件系统读取
      zipInstance = new JSZipClass();
      // TODO: 扫描文件夹建立索引
    } else {
      throw new Error(`Unsupported mount source type: ${(source as MountSource).type}`);
    }

    // 建立文件索引
    const fileIndex = new Map<string, { size: number; isDirectory: boolean }>();
    let totalSize = 0;

    for (const [path, zipObject] of Object.entries(zipInstance.files)) {
      const isDirectory = zipObject.dir;
      // 跳过 .card/ 配置目录和 content/ 配置目录
      // 这些是结构文件，不作为"资源"暴露
      const size = 0; // JSZip 不直接暴露大小，需要解压时才能获取
      fileIndex.set(path, { size, isDirectory });
    }

    return { zipInstance, zipData, fileIndex, totalSize };
  }

  /**
   * 确保挂载运行时可用
   *
   * 如果运行时不在内存中但在持久化存储中，尝试恢复（懒加载）
   */
  private async _ensureMountRuntime(cardId: string): Promise<CardMountRuntime | null> {
    // 已在内存中
    const existing = this._mounts.get(cardId);
    if (existing) return existing;

    // 尝试从持久化存储恢复
    const record = this._mountStore.getRecord(cardId);
    if (!record) return null;

    // 只有 zip-path 和 directory 类型可以恢复（zip-data 不持久化二进制）
    if (record.source.type === 'zip-path' || record.source.type === 'directory') {
      try {
        await this.mountCard(cardId, record.source, {
          strategy: record.strategy,
          persistent: false, // 不再重复持久化
        });
        return this._mounts.get(cardId) ?? null;
      } catch {
        // 恢复失败（文件可能已移动），从持久化存储移除
        await this._mountStore.removeRecord(cardId);
        return null;
      }
    }

    return null;
  }

  /**
   * 从磁盘读取文件
   */
  private async _readFileFromDisk(path: string): Promise<Uint8Array> {
    if (typeof process !== 'undefined' && process.versions?.node) {
      const { readFile } = await import('fs/promises');
      const buffer = await readFile(path);
      return new Uint8Array(buffer);
    }
    throw new Error('File system access not available in this environment');
  }

  /**
   * 推断 MIME 类型
   */
  private _inferMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    return EXTENSION_MIME_MAP[ext] ?? 'application/octet-stream';
  }

  // ========== LRU 缓存 ==========

  /**
   * 从缓存获取
   */
  private _getFromCache(key: string): ResourceCacheEntry | null {
    const entry = this._cache.get(key);
    if (!entry) return null;

    // 检查 TTL
    if (Date.now() - entry.createdAt > this._cacheConfig.ttl) {
      this._cache.delete(key);
      this._currentCacheSize -= entry.size;
      return null;
    }

    // 更新访问时间（LRU）
    entry.lastAccessedAt = Date.now();
    return entry;
  }

  /**
   * 添加到缓存
   */
  private _addToCache(key: string, data: Uint8Array, mimeType: string): void {
    const size = data.byteLength;

    // 如果单个资源超过缓存限制的一半，不缓存
    if (size > this._cacheConfig.maxSize / 2) return;

    // 腾出空间
    while (
      (this._currentCacheSize + size > this._cacheConfig.maxSize ||
        this._cache.size >= this._cacheConfig.maxEntries) &&
      this._cache.size > 0
    ) {
      this._evictLRU();
    }

    const entry: ResourceCacheEntry = {
      key,
      data,
      mimeType,
      size,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this._cache.set(key, entry);
    this._currentCacheSize += size;
  }

  /**
   * LRU 淘汰
   */
  private _evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this._cache) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this._cache.get(oldestKey)!;
      this._cache.delete(oldestKey);
      this._currentCacheSize -= entry.size;
    }
  }

  /**
   * 淘汰指定卡片的所有缓存
   */
  private _evictCardCache(cardId: string): void {
    const prefix = `${cardId}:`;
    for (const [key, entry] of this._cache) {
      if (key.startsWith(prefix)) {
        this._cache.delete(key);
        this._currentCacheSize -= entry.size;
      }
    }
  }
}

/**
 * 全局资源管理器实例
 */
export const resourceManager = new ResourceManager();
