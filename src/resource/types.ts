/**
 * 资源管理器类型定义
 * @module @chips/foundation/resource/types
 *
 * 定义卡片挂载、资源访问、缓存管理等核心数据结构。
 */

// ============================================================================
// 挂载源类型
// ============================================================================

/**
 * ZIP 文件路径挂载源
 */
export interface ZipPathSource {
  type: 'zip-path';
  /** ZIP 文件路径 */
  path: string;
}

/**
 * ZIP 二进制数据挂载源
 */
export interface ZipDataSource {
  type: 'zip-data';
  /** ZIP 二进制数据 */
  data: Uint8Array;
}

/**
 * 文件夹挂载源（解压后的卡片文件夹）
 */
export interface DirectorySource {
  type: 'directory';
  /** 文件夹路径 */
  path: string;
}

/**
 * 网络挂载源
 */
export interface NetworkSource {
  type: 'network';
  /** 网络 URL */
  url: string;
}

/**
 * 挂载源（联合类型）
 */
export type MountSource = ZipPathSource | ZipDataSource | DirectorySource | NetworkSource;

// ============================================================================
// 资源加载策略
// ============================================================================

/**
 * 资源加载策略
 *
 * - direct-read: 按需直接从 ZIP 提取（默认，不解压全部）
 * - extract-to-workspace: 解压到工作区目录后读取文件
 * - network: 通过网络协议访问
 * - link-local: 链接到本地已有文件
 */
export type ResourceStrategy = 'direct-read' | 'extract-to-workspace' | 'network' | 'link-local';

// ============================================================================
// 挂载选项和结果
// ============================================================================

/**
 * 挂载选项
 */
export interface MountOptions {
  /** 资源加载策略（默认 direct-read） */
  strategy?: ResourceStrategy;
  /** LRU 缓存大小限制（字节，默认 50MB） */
  cacheSizeLimit?: number;
  /** 是否持久化到挂载表数据库（默认 true） */
  persistent?: boolean;
}

/**
 * 挂载结果
 */
export interface MountResult {
  /** 卡片 ID */
  cardId: string;
  /** 卡片内资源文件数量 */
  resourceCount: number;
  /** 资源总大小（字节） */
  totalSize: number;
  /** 使用的资源策略 */
  strategy: ResourceStrategy;
  /** 挂载时间（ISO 8601） */
  mountedAt: string;
}

// ============================================================================
// 挂载记录（持久化）
// ============================================================================

/**
 * 挂载记录
 *
 * 持久化到挂载表数据库文件中
 */
export interface MountRecord {
  /** 卡片 ID */
  cardId: string;
  /** 挂载源信息 */
  source: MountSource;
  /** 资源加载策略 */
  strategy: ResourceStrategy;
  /** 挂载时间 */
  mountedAt: string;
  /** 资源文件数量 */
  resourceCount: number;
  /** 总大小（字节） */
  totalSize: number;
  /** 最后访问时间 */
  lastAccessedAt: string;
}

/**
 * 挂载表数据库结构
 */
export interface MountDatabase {
  /** 数据库版本 */
  version: string;
  /** 最后更新时间 */
  updatedAt: string;
  /** 挂载记录列表 */
  records: MountRecord[];
}

// ============================================================================
// 资源数据
// ============================================================================

/**
 * 资源数据（loadResource 返回）
 */
export interface ResourceData {
  /** 资源二进制数据 */
  data: Uint8Array;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小（字节） */
  size: number;
  /** 资源相对路径 */
  path: string;
}

/**
 * 资源元信息
 */
export interface ResourceMeta {
  /** 资源路径 */
  path: string;
  /** 文件大小 */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 是否存在 */
  exists: boolean;
}

/**
 * 资源条目（listResources 返回）
 */
export interface ResourceEntry {
  /** 文件路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 是否为目录 */
  isDirectory: boolean;
}

// ============================================================================
// 缓存配置
// ============================================================================

/**
 * LRU 缓存配置
 */
export interface CacheConfig {
  /** 最大缓存大小（字节，默认 50MB） */
  maxSize: number;
  /** 最大缓存条目数（默认 200） */
  maxEntries: number;
  /** 缓存存活时间（毫秒，默认 30 分钟） */
  ttl: number;
}

/**
 * 缓存条目
 */
export interface ResourceCacheEntry {
  /** 缓存键 */
  key: string;
  /** 资源数据 */
  data: Uint8Array;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小 */
  size: number;
  /** 创建时间 */
  createdAt: number;
  /** 最后访问时间 */
  lastAccessedAt: number;
}

// ============================================================================
// ResourceManager 选项
// ============================================================================

/**
 * ResourceManager 构造选项
 */
export interface ResourceManagerOptions {
  /** LRU 缓存配置 */
  cache?: Partial<CacheConfig>;
  /** 挂载表数据库文件路径 */
  mountDbPath?: string;
  /** 工作区根目录（extract-to-workspace 策略使用） */
  workspaceRoot?: string;
}
