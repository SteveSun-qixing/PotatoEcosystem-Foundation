/**
 * RuntimeManager 运行时管理器
 * @module @chips/foundation/runtime/runtime-manager/runtime-manager
 *
 * 管理模块的动态加载和生命周期
 * 提供事件系统和性能监控功能
 */

import type { ModuleStatus, ModuleDescriptor } from '../../core/types';
import type { IModule } from '../../core/interfaces';
import { ModuleError, ErrorCodes } from '../../core/errors';
import type {
  IRuntimeManager,
  ModuleRegistration,
  ModuleStats,
  DependencyGraph,
  ModuleLoadHandler,
  ModuleUnloadHandler,
  ModuleErrorHandler,
  ModuleLoadEvent,
  ModuleUnloadEvent,
  ModuleErrorEvent,
  RuntimeManagerConfig,
} from './types';

// ============================================================================
// RuntimeManager 实现
// ============================================================================

/**
 * RuntimeManager 运行时管理器
 * 管理模块的动态加载和生命周期
 */
export class RuntimeManager implements IRuntimeManager {
  private modules: Map<string, ModuleRegistration> = new Map();
  private loadOrder: string[] = [];
  private stats: Map<string, ModuleStats> = new Map();
  private config: RuntimeManagerConfig;
  private initialized: boolean = false;

  // 事件处理器
  private loadHandlers: Set<ModuleLoadHandler> = new Set();
  private unloadHandlers: Set<ModuleUnloadHandler> = new Set();
  private errorHandlers: Set<ModuleErrorHandler> = new Set();

  constructor(config?: RuntimeManagerConfig) {
    this.config = {
      enableStats: true,
      enableDebugLog: false,
      maxConcurrentLoads: 5,
      loadTimeout: 30000,
      autoResolveDependencies: true,
      ...config,
    };
  }

  // ========== 模块注册 ==========

  /**
   * 注册模块
   */
  async register(module: IModule): Promise<void> {
    const moduleId = module.moduleId;

    if (this.modules.has(moduleId)) {
      throw new ModuleError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        moduleId,
        `Module ${moduleId} is already registered`
      );
    }

    this.modules.set(moduleId, {
      instance: module,
      status: 'unloaded',
    });

    // 初始化统计
    if (this.config.enableStats) {
      this.stats.set(moduleId, {
        moduleId,
        loadTime: 0,
        memoryUsage: 0,
        callCount: 0,
        errorCount: 0,
        lastActive: 0,
        loadedAt: 0,
      });
    }

    this.log(`Module ${moduleId} registered`);
  }

  /**
   * 注销模块
   */
  async unregister(moduleId: string): Promise<void> {
    const registration = this.modules.get(moduleId);
    if (!registration) {
      return;
    }

    // 如果已加载，先卸载
    if (registration.status === 'loaded') {
      await this.unload(moduleId);
    }

    this.modules.delete(moduleId);
    this.stats.delete(moduleId);
    this.log(`Module ${moduleId} unregistered`);
  }

  // ========== 模块加载 ==========

  /**
   * 加载模块
   */
  async load(moduleId: string): Promise<void> {
    const registration = this.modules.get(moduleId);

    if (!registration) {
      throw new ModuleError(
        ErrorCodes.MODULE_NOT_FOUND,
        moduleId,
        `Module ${moduleId} not found`
      );
    }

    if (registration.status === 'loaded') {
      return;
    }

    const startTime = Date.now();

    // 检查并加载依赖
    if (this.config.autoResolveDependencies) {
      const descriptor = registration.instance.getDescriptor();
      for (const depId of descriptor.dependencies) {
        const dep = this.modules.get(depId);
        if (!dep) {
          throw new ModuleError(
            ErrorCodes.MODULE_NOT_FOUND,
            moduleId,
            `Dependency ${depId} not found for module ${moduleId}`
          );
        }
        if (dep.status !== 'loaded') {
          await this.load(depId);
        }
      }
    }

    try {
      registration.status = 'loading';
      this.log(`Loading module ${moduleId}...`);

      // 使用超时包装初始化
      await this.withTimeout(
        registration.instance.initialize(),
        this.config.loadTimeout ?? 30000,
        `Module ${moduleId} initialization timed out`
      );

      const loadTime = Date.now() - startTime;

      registration.status = 'loaded';
      registration.loadedAt = Date.now();
      registration.initializedAt = Date.now();
      registration.loadTime = loadTime;
      this.loadOrder.push(moduleId);

      // 更新统计
      if (this.config.enableStats) {
        const stat = this.stats.get(moduleId);
        if (stat) {
          stat.loadTime = loadTime;
          stat.loadedAt = registration.loadedAt;
          stat.initializedAt = registration.initializedAt;
          stat.lastActive = Date.now();
        }
      }

      // 触发事件
      this.emitLoadEvent({
        moduleId,
        loadTime,
        timestamp: Date.now(),
      });

      this.log(`Module ${moduleId} loaded in ${loadTime}ms`);
    } catch (error) {
      registration.status = 'error';

      // 触发错误事件
      this.emitErrorEvent({
        moduleId,
        error: error as Error,
        timestamp: Date.now(),
        context: 'load',
      });

      throw new ModuleError(
        ErrorCodes.MODULE_INIT_ERROR,
        moduleId,
        `Failed to load module ${moduleId}: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * 卸载模块
   */
  async unload(moduleId: string): Promise<void> {
    const registration = this.modules.get(moduleId);

    if (!registration) {
      return;
    }

    if (registration.status !== 'loaded') {
      return;
    }

    // 检查是否有其他模块依赖此模块
    for (const [id, reg] of this.modules.entries()) {
      if (id === moduleId) {
        continue;
      }
      const deps = reg.instance.getDescriptor().dependencies;
      if (deps.includes(moduleId) && reg.status === 'loaded') {
        throw new ModuleError(
          ErrorCodes.MODULE_LOAD_ERROR,
          moduleId,
          `Cannot unload ${moduleId}: module ${id} depends on it`
        );
      }
    }

    try {
      this.log(`Unloading module ${moduleId}...`);
      await registration.instance.dispose();
      registration.status = 'disposed';
      this.loadOrder = this.loadOrder.filter((id) => id !== moduleId);

      // 触发事件
      this.emitUnloadEvent({
        moduleId,
        timestamp: Date.now(),
      });

      this.log(`Module ${moduleId} unloaded`);
    } catch (error) {
      // 触发错误事件
      this.emitErrorEvent({
        moduleId,
        error: error as Error,
        timestamp: Date.now(),
        context: 'unload',
      });

      throw new ModuleError(
        ErrorCodes.MODULE_LOAD_ERROR,
        moduleId,
        `Failed to unload module ${moduleId}: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * 重载模块
   */
  async reloadModule(moduleId: string): Promise<IModule> {
    const registration = this.modules.get(moduleId);

    if (!registration) {
      throw new ModuleError(
        ErrorCodes.MODULE_NOT_FOUND,
        moduleId,
        `Module ${moduleId} not found`
      );
    }

    this.log(`Reloading module ${moduleId}...`);

    // 保存模块实例引用
    const module = registration.instance;

    // 先卸载
    if (registration.status === 'loaded') {
      await this.unload(moduleId);
    }

    // 重置状态
    registration.status = 'unloaded';
    registration.loadedAt = undefined;
    registration.initializedAt = undefined;
    registration.loadTime = undefined;

    // 重新加载
    await this.load(moduleId);

    this.log(`Module ${moduleId} reloaded`);
    return module;
  }

  // ========== 模块查询 ==========

  /**
   * 获取模块
   */
  getModule<T extends IModule>(moduleId: string): T | undefined {
    const registration = this.modules.get(moduleId);
    return registration?.instance as T | undefined;
  }

  /**
   * 获取模块状态
   */
  getModuleStatus(moduleId: string): ModuleStatus | undefined {
    return this.modules.get(moduleId)?.status;
  }

  /**
   * 获取所有模块描述符
   */
  getAllDescriptors(): ModuleDescriptor[] {
    return Array.from(this.modules.values()).map((reg) => reg.instance.getDescriptor());
  }

  /**
   * 检查模块是否已加载
   */
  isLoaded(moduleId: string): boolean {
    return this.modules.get(moduleId)?.status === 'loaded';
  }

  /**
   * 获取加载顺序
   */
  getLoadOrder(): string[] {
    return [...this.loadOrder];
  }

  // ========== 依赖管理 ==========

  /**
   * 解析模块依赖
   * 返回按加载顺序排列的依赖列表（包括间接依赖）
   */
  resolveDependencies(moduleId: string): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();

    const resolve = (id: string): void => {
      if (visited.has(id)) {
        return;
      }
      visited.add(id);

      const registration = this.modules.get(id);
      if (!registration) {
        return;
      }

      const deps = registration.instance.getDescriptor().dependencies;
      for (const dep of deps) {
        resolve(dep);
      }

      if (id !== moduleId) {
        resolved.push(id);
      }
    };

    resolve(moduleId);
    return resolved;
  }

  /**
   * 获取依赖图
   */
  getDependencyGraph(): DependencyGraph {
    const dependencies = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();

    // 构建依赖关系
    for (const [moduleId, reg] of this.modules.entries()) {
      const deps = reg.instance.getDescriptor().dependencies;
      dependencies.set(moduleId, [...deps]);

      // 构建反向依赖
      for (const dep of deps) {
        if (!dependents.has(dep)) {
          dependents.set(dep, []);
        }
        dependents.get(dep)!.push(moduleId);
      }
    }

    // 找出根模块（没有依赖的模块）
    const roots: string[] = [];
    for (const [moduleId, deps] of dependencies.entries()) {
      if (deps.length === 0) {
        roots.push(moduleId);
      }
    }

    // 找出叶子模块（没有被依赖的模块）
    const leaves: string[] = [];
    for (const moduleId of this.modules.keys()) {
      if (!dependents.has(moduleId) || dependents.get(moduleId)!.length === 0) {
        leaves.push(moduleId);
      }
    }

    return { dependencies, dependents, roots, leaves };
  }

  // ========== 生命周期 ==========

  /**
   * 初始化运行时管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.log('RuntimeManager initializing...');
    this.initialized = true;
    this.log('RuntimeManager initialized');
  }

  /**
   * 关闭运行时管理器
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.log('RuntimeManager shutting down...');

    // 卸载所有模块
    await this.unloadAll();

    // 清理事件处理器
    this.loadHandlers.clear();
    this.unloadHandlers.clear();
    this.errorHandlers.clear();

    this.initialized = false;
    this.log('RuntimeManager shut down');
  }

  /**
   * 卸载所有模块
   */
  async unloadAll(): Promise<void> {
    // 按加载顺序的反序卸载
    const order = [...this.loadOrder].reverse();
    for (const moduleId of order) {
      try {
        await this.unload(moduleId);
      } catch (error) {
        // 记录错误但继续卸载其他模块
        this.emitErrorEvent({
          moduleId,
          error: error as Error,
          timestamp: Date.now(),
          context: 'unloadAll',
        });
      }
    }
  }

  // ========== 事件系统 ==========

  /**
   * 监听模块加载事件
   */
  onModuleLoad(handler: ModuleLoadHandler): () => void {
    this.loadHandlers.add(handler);
    return () => {
      this.loadHandlers.delete(handler);
    };
  }

  /**
   * 监听模块卸载事件
   */
  onModuleUnload(handler: ModuleUnloadHandler): () => void {
    this.unloadHandlers.add(handler);
    return () => {
      this.unloadHandlers.delete(handler);
    };
  }

  /**
   * 监听模块错误事件
   */
  onModuleError(handler: ModuleErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * 触发加载事件
   */
  private emitLoadEvent(event: ModuleLoadEvent): void {
    for (const handler of this.loadHandlers) {
      try {
        handler(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in module load handler:', error);
      }
    }
  }

  /**
   * 触发卸载事件
   */
  private emitUnloadEvent(event: ModuleUnloadEvent): void {
    for (const handler of this.unloadHandlers) {
      try {
        handler(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in module unload handler:', error);
      }
    }
  }

  /**
   * 触发错误事件
   */
  private emitErrorEvent(event: ModuleErrorEvent): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in module error handler:', error);
      }
    }
  }

  // ========== 性能监控 ==========

  /**
   * 获取模块统计
   */
  getModuleStats(moduleId: string): ModuleStats | undefined {
    return this.stats.get(moduleId);
  }

  /**
   * 获取所有模块统计
   */
  getAllStats(): Map<string, ModuleStats> {
    return new Map(this.stats);
  }

  /**
   * 重置模块统计
   */
  resetStats(moduleId?: string): void {
    if (moduleId) {
      const stat = this.stats.get(moduleId);
      if (stat) {
        stat.callCount = 0;
        stat.errorCount = 0;
      }
    } else {
      for (const stat of this.stats.values()) {
        stat.callCount = 0;
        stat.errorCount = 0;
      }
    }
  }

  /**
   * 记录模块调用
   */
  recordCall(moduleId: string): void {
    if (!this.config.enableStats) {
      return;
    }
    const stat = this.stats.get(moduleId);
    if (stat) {
      stat.callCount++;
      stat.lastActive = Date.now();
    }
  }

  /**
   * 记录模块错误
   */
  recordError(moduleId: string): void {
    if (!this.config.enableStats) {
      return;
    }
    const stat = this.stats.get(moduleId);
    if (stat) {
      stat.errorCount++;
      stat.lastActive = Date.now();
    }
  }

  // ========== 私有方法 ==========

  /**
   * 超时包装
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    message: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(message));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 日志
   */
  private log(message: string): void {
    if (this.config.enableDebugLog) {
      // eslint-disable-next-line no-console
      console.log(`[RuntimeManager] ${message}`);
    }
  }
}

/**
 * 全局运行时管理器实例
 */
export const runtimeManager = new RuntimeManager();
