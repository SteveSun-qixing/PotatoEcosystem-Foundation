/**
 * RuntimeManager 单元测试
 * @module tests/unit/runtime/runtime-manager.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RuntimeManager,
  runtimeManager,
} from '../../../src/runtime/runtime-manager';
import type {
  ModuleStats,
  ModuleLoadEvent,
  ModuleUnloadEvent,
  ModuleErrorEvent,
} from '../../../src/runtime/runtime-manager';
import type { IModule } from '../../../src/core/interfaces';
import type { ModuleStatus, ModuleDescriptor } from '../../../src/core/types';

// ============================================================================
// 模拟模块
// ============================================================================

/**
 * 创建模拟模块
 */
function createMockModule(
  id: string,
  dependencies: string[] = [],
  initDelay = 0,
  shouldFail = false
): IModule {
  let status: ModuleStatus = 'unloaded';

  return {
    moduleId: id,
    moduleName: `Test Module ${id}`,
    version: '1.0.0',

    async initialize(): Promise<void> {
      if (initDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, initDelay));
      }
      if (shouldFail) {
        throw new Error(`Module ${id} initialization failed`);
      }
      status = 'loaded';
    },

    async dispose(): Promise<void> {
      status = 'disposed';
    },

    getStatus(): ModuleStatus {
      return status;
    },

    getDescriptor(): ModuleDescriptor {
      return {
        id,
        name: `Test Module ${id}`,
        version: '1.0.0',
        description: `Test description for ${id}`,
        dependencies,
        services: [],
      };
    },
  };
}

// ============================================================================
// RuntimeManager 测试
// ============================================================================

describe('RuntimeManager', () => {
  let manager: RuntimeManager;

  beforeEach(() => {
    manager = new RuntimeManager({
      enableStats: true,
      enableDebugLog: false,
      loadTimeout: 5000,
    });
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('模块注册', () => {
    it('应该能注册模块', async () => {
      const module = createMockModule('test-module');
      await manager.register(module);

      const status = manager.getModuleStatus('test-module');
      expect(status).toBe('unloaded');
    });

    it('应该拒绝重复注册模块', async () => {
      const module = createMockModule('duplicate-module');
      await manager.register(module);

      await expect(manager.register(module)).rejects.toThrow(
        'Module duplicate-module is already registered'
      );
    });

    it('应该能注销模块', async () => {
      const module = createMockModule('unregister-module');
      await manager.register(module);
      await manager.unregister('unregister-module');

      const status = manager.getModuleStatus('unregister-module');
      expect(status).toBeUndefined();
    });

    it('应该能注销已加载的模块', async () => {
      const module = createMockModule('loaded-unregister');
      await manager.register(module);
      await manager.load('loaded-unregister');
      await manager.unregister('loaded-unregister');

      const status = manager.getModuleStatus('loaded-unregister');
      expect(status).toBeUndefined();
    });
  });

  describe('模块加载', () => {
    it('应该能加载模块', async () => {
      const module = createMockModule('load-test');
      await manager.register(module);
      await manager.load('load-test');

      expect(manager.isLoaded('load-test')).toBe(true);
    });

    it('应该拒绝加载未注册的模块', async () => {
      await expect(manager.load('non-existent')).rejects.toThrow(
        'Module non-existent not found'
      );
    });

    it('应该跳过已加载的模块', async () => {
      const module = createMockModule('already-loaded');
      await manager.register(module);
      await manager.load('already-loaded');
      await manager.load('already-loaded'); // 第二次调用应该跳过

      expect(manager.isLoaded('already-loaded')).toBe(true);
    });

    it('应该自动加载依赖', async () => {
      const depModule = createMockModule('dependency');
      const mainModule = createMockModule('main', ['dependency']);

      await manager.register(depModule);
      await manager.register(mainModule);
      await manager.load('main');

      expect(manager.isLoaded('dependency')).toBe(true);
      expect(manager.isLoaded('main')).toBe(true);
    });

    it('应该拒绝加载缺失依赖的模块', async () => {
      const module = createMockModule('missing-dep', ['non-existent']);
      await manager.register(module);

      await expect(manager.load('missing-dep')).rejects.toThrow(
        'Dependency non-existent not found'
      );
    });

    it('应该处理初始化失败', async () => {
      const module = createMockModule('fail-init', [], 0, true);
      await manager.register(module);

      await expect(manager.load('fail-init')).rejects.toThrow();

      const status = manager.getModuleStatus('fail-init');
      expect(status).toBe('error');
    });
  });

  describe('模块卸载', () => {
    it('应该能卸载模块', async () => {
      const module = createMockModule('unload-test');
      await manager.register(module);
      await manager.load('unload-test');
      await manager.unload('unload-test');

      expect(manager.isLoaded('unload-test')).toBe(false);
    });

    it('应该跳过未加载的模块', async () => {
      const module = createMockModule('not-loaded');
      await manager.register(module);
      await manager.unload('not-loaded'); // 应该不报错

      expect(manager.getModuleStatus('not-loaded')).toBe('unloaded');
    });

    it('应该拒绝卸载被依赖的模块', async () => {
      const depModule = createMockModule('dep-unload');
      const mainModule = createMockModule('main-unload', ['dep-unload']);

      await manager.register(depModule);
      await manager.register(mainModule);
      await manager.load('main-unload');

      await expect(manager.unload('dep-unload')).rejects.toThrow(
        'Cannot unload dep-unload: module main-unload depends on it'
      );
    });
  });

  describe('模块重载', () => {
    it('应该能重载模块', async () => {
      const module = createMockModule('reload-test');
      await manager.register(module);
      await manager.load('reload-test');

      const reloaded = await manager.reloadModule('reload-test');
      expect(reloaded).toBeDefined();
      expect(manager.isLoaded('reload-test')).toBe(true);
    });

    it('应该拒绝重载未注册的模块', async () => {
      await expect(manager.reloadModule('non-existent')).rejects.toThrow(
        'Module non-existent not found'
      );
    });
  });

  describe('模块查询', () => {
    it('应该能获取模块', async () => {
      const module = createMockModule('get-test');
      await manager.register(module);

      const retrieved = manager.getModule('get-test');
      expect(retrieved).toBe(module);
    });

    it('应该返回 undefined 当模块不存在', () => {
      const module = manager.getModule('non-existent');
      expect(module).toBeUndefined();
    });

    it('应该能获取所有模块描述符', async () => {
      await manager.register(createMockModule('desc-1'));
      await manager.register(createMockModule('desc-2'));

      const descriptors = manager.getAllDescriptors();
      expect(descriptors.length).toBe(2);
      expect(descriptors.some((d) => d.id === 'desc-1')).toBe(true);
      expect(descriptors.some((d) => d.id === 'desc-2')).toBe(true);
    });

    it('应该能获取加载顺序', async () => {
      await manager.register(createMockModule('order-1'));
      await manager.register(createMockModule('order-2'));
      await manager.load('order-1');
      await manager.load('order-2');

      const order = manager.getLoadOrder();
      expect(order).toEqual(['order-1', 'order-2']);
    });
  });

  describe('依赖管理', () => {
    it('应该能解析模块依赖', async () => {
      await manager.register(createMockModule('dep-a'));
      await manager.register(createMockModule('dep-b', ['dep-a']));
      await manager.register(createMockModule('dep-c', ['dep-b']));

      const deps = manager.resolveDependencies('dep-c');
      expect(deps).toContain('dep-a');
      expect(deps).toContain('dep-b');
      expect(deps.indexOf('dep-a')).toBeLessThan(deps.indexOf('dep-b'));
    });

    it('应该能获取依赖图', async () => {
      await manager.register(createMockModule('graph-a'));
      await manager.register(createMockModule('graph-b', ['graph-a']));
      await manager.register(createMockModule('graph-c', ['graph-a']));

      const graph = manager.getDependencyGraph();
      expect(graph.roots).toContain('graph-a');
      expect(graph.leaves).toContain('graph-b');
      expect(graph.leaves).toContain('graph-c');
      expect(graph.dependents.get('graph-a')).toContain('graph-b');
      expect(graph.dependents.get('graph-a')).toContain('graph-c');
    });
  });

  describe('事件系统', () => {
    it('应该在模块加载时触发事件', async () => {
      const handler = vi.fn();
      manager.onModuleLoad(handler);

      const module = createMockModule('event-load');
      await manager.register(module);
      await manager.load('event-load');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          moduleId: 'event-load',
        })
      );
    });

    it('应该在模块卸载时触发事件', async () => {
      const handler = vi.fn();
      manager.onModuleUnload(handler);

      const module = createMockModule('event-unload');
      await manager.register(module);
      await manager.load('event-unload');
      await manager.unload('event-unload');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          moduleId: 'event-unload',
        })
      );
    });

    it('应该在模块错误时触发事件', async () => {
      const handler = vi.fn();
      manager.onModuleError(handler);

      const module = createMockModule('event-error', [], 0, true);
      await manager.register(module);

      try {
        await manager.load('event-error');
      } catch {
        // 预期错误
      }

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          moduleId: 'event-error',
        })
      );
    });

    it('应该能取消事件监听', async () => {
      const handler = vi.fn();
      const unsubscribe = manager.onModuleLoad(handler);
      unsubscribe();

      const module = createMockModule('event-cancel');
      await manager.register(module);
      await manager.load('event-cancel');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('性能监控', () => {
    it('应该能获取模块统计', async () => {
      const module = createMockModule('stats-test');
      await manager.register(module);
      await manager.load('stats-test');

      const stats = manager.getModuleStats('stats-test');
      expect(stats).toBeDefined();
      expect(stats?.moduleId).toBe('stats-test');
      expect(stats?.loadTime).toBeGreaterThanOrEqual(0);
    });

    it('应该能获取所有模块统计', async () => {
      await manager.register(createMockModule('stats-1'));
      await manager.register(createMockModule('stats-2'));
      await manager.load('stats-1');
      await manager.load('stats-2');

      const allStats = manager.getAllStats();
      expect(allStats.size).toBe(2);
    });

    it('应该能重置模块统计', async () => {
      const module = createMockModule('stats-reset');
      await manager.register(module);
      await manager.load('stats-reset');

      manager.recordCall('stats-reset');
      manager.recordCall('stats-reset');
      manager.recordError('stats-reset');

      let stats = manager.getModuleStats('stats-reset');
      expect(stats?.callCount).toBe(2);
      expect(stats?.errorCount).toBe(1);

      manager.resetStats('stats-reset');
      stats = manager.getModuleStats('stats-reset');
      expect(stats?.callCount).toBe(0);
      expect(stats?.errorCount).toBe(0);
    });

    it('应该能重置所有模块统计', async () => {
      await manager.register(createMockModule('stats-all-1'));
      await manager.register(createMockModule('stats-all-2'));

      manager.recordCall('stats-all-1');
      manager.recordCall('stats-all-2');

      manager.resetStats();

      const stats1 = manager.getModuleStats('stats-all-1');
      const stats2 = manager.getModuleStats('stats-all-2');
      expect(stats1?.callCount).toBe(0);
      expect(stats2?.callCount).toBe(0);
    });

    it('应该能记录模块调用', async () => {
      const module = createMockModule('record-call');
      await manager.register(module);

      manager.recordCall('record-call');
      const stats = manager.getModuleStats('record-call');
      expect(stats?.callCount).toBe(1);
    });

    it('应该能记录模块错误', async () => {
      const module = createMockModule('record-error');
      await manager.register(module);

      manager.recordError('record-error');
      const stats = manager.getModuleStats('record-error');
      expect(stats?.errorCount).toBe(1);
    });
  });

  describe('生命周期', () => {
    it('应该能初始化', async () => {
      await manager.initialize();
      // 初始化应该是幂等的
      await manager.initialize();
    });

    it('应该能关闭', async () => {
      // 先初始化 manager
      await manager.initialize();
      
      const module = createMockModule('shutdown-test');
      await manager.register(module);
      await manager.load('shutdown-test');

      // 关闭会卸载所有模块
      await manager.shutdown();
      // shutdown 后状态应该是 unloaded
      const status = manager.getModuleStatus('shutdown-test');
      expect(status === 'unloaded' || status === 'disposed').toBe(true);
    });

    it('应该能卸载所有模块', async () => {
      await manager.register(createMockModule('unload-all-1'));
      await manager.register(createMockModule('unload-all-2'));
      await manager.load('unload-all-1');
      await manager.load('unload-all-2');

      await manager.unloadAll();
      expect(manager.isLoaded('unload-all-1')).toBe(false);
      expect(manager.isLoaded('unload-all-2')).toBe(false);
    });
  });
});

// ============================================================================
// 全局实例测试
// ============================================================================

describe('全局实例', () => {
  it('runtimeManager 应该是 RuntimeManager 实例', () => {
    expect(runtimeManager).toBeInstanceOf(RuntimeManager);
  });
});
