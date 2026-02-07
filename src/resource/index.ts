/**
 * 资源管理模块导出
 * @module @chips/foundation/resource
 *
 * 提供卡片挂载和资源访问服务。
 */

export { ResourceManager, resourceManager } from './resource-manager';
export { MountStore } from './mount-store';

export type {
  // 挂载源
  MountSource,
  ZipPathSource,
  ZipDataSource,
  DirectorySource,
  NetworkSource,
  // 策略
  ResourceStrategy,
  // 挂载
  MountOptions,
  MountResult,
  MountRecord,
  MountDatabase,
  // 资源数据
  ResourceData,
  ResourceMeta,
  ResourceEntry,
  // 缓存
  CacheConfig,
  ResourceCacheEntry,
  // 选项
  ResourceManagerOptions,
} from './types';
