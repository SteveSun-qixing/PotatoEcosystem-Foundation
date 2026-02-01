/**
 * RuntimeManager 运行时管理器
 * @module @chips/foundation/runtime/runtime-manager/runtime-manager
 *
 * 管理模块的动态加载和生命周期
 */

import type { ModuleStatus, ModuleDescriptor } from '../../core/types';
import type { IModule } from '../../core/interfaces';
import { ModuleError, ErrorCodes } from '../../core/errors';

/**
 * 模块注册信息
 */
interface ModuleRegistration {
  /** 模块实例 */
  instance: IModule;
  /** 状态 */
  status: ModuleStatus;
  /** 加载时间 */
  loadedAt?: number;
}

/**
 * RuntimeManager 运行时管理器
 */
export class RuntimeManager {
  private modules: Map<string, ModuleRegistration> = new Map();
  private loadOrder: string[] = [];

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
  }

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

    // 检查依赖
    const descriptor = registration.instance.getDescriptor();
    for (const depId of descriptor.dependencies) {
      const dep = this.modules.get(depId);
      if (!dep || dep.status !== 'loaded') {
        // 尝试先加载依赖
        await this.load(depId);
      }
    }

    try {
      registration.status = 'loading';
      await registration.instance.initialize();
      registration.status = 'loaded';
      registration.loadedAt = Date.now();
      this.loadOrder.push(moduleId);
    } catch (error) {
      registration.status = 'error';
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
      await registration.instance.dispose();
      registration.status = 'disposed';
      this.loadOrder = this.loadOrder.filter((id) => id !== moduleId);
    } catch (error) {
      throw new ModuleError(
        ErrorCodes.MODULE_LOAD_ERROR,
        moduleId,
        `Failed to unload module ${moduleId}: ${(error as Error).message}`,
        error as Error
      );
    }
  }

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

  /**
   * 卸载所有模块
   */
  async unloadAll(): Promise<void> {
    // 按加载顺序的反序卸载
    const order = [...this.loadOrder].reverse();
    for (const moduleId of order) {
      await this.unload(moduleId);
    }
  }
}

/**
 * 全局运行时管理器实例
 */
export const runtimeManager = new RuntimeManager();
