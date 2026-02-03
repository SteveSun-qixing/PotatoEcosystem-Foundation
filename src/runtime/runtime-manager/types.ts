/**
 * RuntimeManager 类型定义
 * @module @chips/foundation/runtime/runtime-manager/types
 *
 * 提供运行时管理器的完整类型定义
 */

import type { ModuleStatus, ModuleDescriptor } from '../../core/types';
import type { IModule } from '../../core/interfaces';

// ============================================================================
// 模块统计类型
// ============================================================================

/**
 * 模块统计信息
 */
export interface ModuleStats {
  /** 模块 ID */
  moduleId: string;
  /** 加载耗时（毫秒） */
  loadTime: number;
  /** 内存占用（字节） */
  memoryUsage: number;
  /** 调用次数 */
  callCount: number;
  /** 错误次数 */
  errorCount: number;
  /** 最后活跃时间戳 */
  lastActive: number;
  /** 加载时间戳 */
  loadedAt: number;
  /** 初始化时间戳 */
  initializedAt?: number;
}

/**
 * 依赖关系图
 */
export interface DependencyGraph {
  /** 模块依赖映射 */
  dependencies: Map<string, string[]>;
  /** 被依赖映射（反向） */
  dependents: Map<string, string[]>;
  /** 根模块（没有依赖的模块） */
  roots: string[];
  /** 叶子模块（没有被依赖的模块） */
  leaves: string[];
}

// ============================================================================
// 事件类型
// ============================================================================

/**
 * 模块加载事件
 */
export interface ModuleLoadEvent {
  /** 模块 ID */
  moduleId: string;
  /** 加载耗时（毫秒） */
  loadTime: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 模块卸载事件
 */
export interface ModuleUnloadEvent {
  /** 模块 ID */
  moduleId: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 模块错误事件
 */
export interface ModuleErrorEvent {
  /** 模块 ID */
  moduleId: string;
  /** 错误对象 */
  error: Error;
  /** 时间戳 */
  timestamp: number;
  /** 错误上下文 */
  context?: string;
}

/**
 * 事件处理器类型
 */
export type ModuleLoadHandler = (event: ModuleLoadEvent) => void;
export type ModuleUnloadHandler = (event: ModuleUnloadEvent) => void;
export type ModuleErrorHandler = (event: ModuleErrorEvent) => void;

// ============================================================================
// 运行时管理器接口
// ============================================================================

/**
 * 运行时管理器接口
 */
export interface IRuntimeManager {
  // ========== 模块注册 ==========
  /**
   * 注册模块
   */
  register(module: IModule): Promise<void>;

  /**
   * 注销模块
   */
  unregister(moduleId: string): Promise<void>;

  // ========== 模块加载 ==========
  /**
   * 加载模块
   */
  load(moduleId: string): Promise<void>;

  /**
   * 卸载模块
   */
  unload(moduleId: string): Promise<void>;

  /**
   * 重载模块
   */
  reloadModule(moduleId: string): Promise<IModule>;

  // ========== 模块查询 ==========
  /**
   * 获取模块
   */
  getModule<T extends IModule>(moduleId: string): T | undefined;

  /**
   * 获取模块状态
   */
  getModuleStatus(moduleId: string): ModuleStatus | undefined;

  /**
   * 获取所有模块描述符
   */
  getAllDescriptors(): ModuleDescriptor[];

  /**
   * 检查模块是否已加载
   */
  isLoaded(moduleId: string): boolean;

  /**
   * 获取加载顺序
   */
  getLoadOrder(): string[];

  // ========== 依赖管理 ==========
  /**
   * 解析模块依赖
   */
  resolveDependencies(moduleId: string): string[];

  /**
   * 获取依赖图
   */
  getDependencyGraph(): DependencyGraph;

  // ========== 生命周期 ==========
  /**
   * 初始化运行时管理器
   */
  initialize(): Promise<void>;

  /**
   * 关闭运行时管理器
   */
  shutdown(): Promise<void>;

  /**
   * 卸载所有模块
   */
  unloadAll(): Promise<void>;

  // ========== 事件系统 ==========
  /**
   * 监听模块加载事件
   */
  onModuleLoad(handler: ModuleLoadHandler): () => void;

  /**
   * 监听模块卸载事件
   */
  onModuleUnload(handler: ModuleUnloadHandler): () => void;

  /**
   * 监听模块错误事件
   */
  onModuleError(handler: ModuleErrorHandler): () => void;

  // ========== 性能监控 ==========
  /**
   * 获取模块统计
   */
  getModuleStats(moduleId: string): ModuleStats | undefined;

  /**
   * 获取所有模块统计
   */
  getAllStats(): Map<string, ModuleStats>;

  /**
   * 重置模块统计
   */
  resetStats(moduleId?: string): void;

  /**
   * 记录模块调用
   */
  recordCall(moduleId: string): void;

  /**
   * 记录模块错误
   */
  recordError(moduleId: string): void;
}

// ============================================================================
// 模块注册信息
// ============================================================================

/**
 * 模块注册信息
 */
export interface ModuleRegistration {
  /** 模块实例 */
  instance: IModule;
  /** 状态 */
  status: ModuleStatus;
  /** 加载时间戳 */
  loadedAt?: number;
  /** 初始化时间戳 */
  initializedAt?: number;
  /** 加载耗时 */
  loadTime?: number;
}

// ============================================================================
// 配置类型
// ============================================================================

/**
 * RuntimeManager 配置
 */
export interface RuntimeManagerConfig {
  /** 是否启用性能监控 */
  enableStats?: boolean;
  /** 是否启用详细日志 */
  enableDebugLog?: boolean;
  /** 最大并发加载数 */
  maxConcurrentLoads?: number;
  /** 加载超时时间（毫秒） */
  loadTimeout?: number;
  /** 是否自动解析依赖 */
  autoResolveDependencies?: boolean;
}
