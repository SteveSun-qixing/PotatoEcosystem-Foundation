/**
 * 运行时模块集成测试
 * @module tests/integration/runtime-integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeManager, ChromiumCore, type IModule, type ModuleDescriptor } from '../../src';

/**
 * 测试用模块 A
 */
class TestModuleA implements IModule {
  moduleId = 'test-module-a';
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  getDescriptor(): ModuleDescriptor {
    return {
      id: this.moduleId,
      name: 'Test Module A',
      version: '1.0.0',
      dependencies: [],
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * 测试用模块 B（依赖 A）
 */
class TestModuleB implements IModule {
  moduleId = 'test-module-b';
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  getDescriptor(): ModuleDescriptor {
    return {
      id: this.moduleId,
      name: 'Test Module B',
      version: '1.0.0',
      dependencies: ['test-module-a'],
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

describe('运行时模块集成测试', () => {
  describe('RuntimeManager 模块生命周期', () => {
    let runtimeManager: RuntimeManager;

    beforeEach(() => {
      runtimeManager = new RuntimeManager();
    });

    it('应该能够注册和加载模块', async () => {
      const moduleA = new TestModuleA();

      await runtimeManager.register(moduleA);
      expect(runtimeManager.getModuleStatus('test-module-a')).toBe('unloaded');

      await runtimeManager.load('test-module-a');
      expect(runtimeManager.getModuleStatus('test-module-a')).toBe('loaded');
      expect(moduleA.isInitialized()).toBe(true);
    });

    it('应该能够自动解析模块依赖', async () => {
      const moduleA = new TestModuleA();
      const moduleB = new TestModuleB();

      await runtimeManager.register(moduleA);
      await runtimeManager.register(moduleB);

      // 加载 B 时应该自动先加载 A
      await runtimeManager.load('test-module-b');

      expect(runtimeManager.isLoaded('test-module-a')).toBe(true);
      expect(runtimeManager.isLoaded('test-module-b')).toBe(true);

      // 检查加载顺序
      const loadOrder = runtimeManager.getLoadOrder();
      expect(loadOrder.indexOf('test-module-a')).toBeLessThan(loadOrder.indexOf('test-module-b'));
    });

    it('应该阻止卸载被依赖的模块', async () => {
      const moduleA = new TestModuleA();
      const moduleB = new TestModuleB();

      await runtimeManager.register(moduleA);
      await runtimeManager.register(moduleB);
      await runtimeManager.load('test-module-b');

      // 尝试卸载 A 应该失败（B 依赖 A）
      await expect(runtimeManager.unload('test-module-a')).rejects.toThrow();

      // 先卸载 B，再卸载 A
      await runtimeManager.unload('test-module-b');
      await runtimeManager.unload('test-module-a');

      expect(runtimeManager.getModuleStatus('test-module-a')).toBe('disposed');
      expect(runtimeManager.getModuleStatus('test-module-b')).toBe('disposed');
    });

    it('应该能够获取所有模块描述符', async () => {
      const moduleA = new TestModuleA();
      const moduleB = new TestModuleB();

      await runtimeManager.register(moduleA);
      await runtimeManager.register(moduleB);

      const descriptors = runtimeManager.getAllDescriptors();

      expect(descriptors).toHaveLength(2);
      expect(descriptors.map((d) => d.id)).toContain('test-module-a');
      expect(descriptors.map((d) => d.id)).toContain('test-module-b');
    });

    it('应该能够卸载所有模块', async () => {
      const moduleA = new TestModuleA();
      const moduleB = new TestModuleB();

      await runtimeManager.register(moduleA);
      await runtimeManager.register(moduleB);
      await runtimeManager.load('test-module-b');

      await runtimeManager.unloadAll();

      expect(runtimeManager.getModuleStatus('test-module-a')).toBe('disposed');
      expect(runtimeManager.getModuleStatus('test-module-b')).toBe('disposed');
    });
  });

  describe('ChromiumCore IPC 通信', () => {
    let chromiumCore: ChromiumCore;

    beforeEach(() => {
      chromiumCore = new ChromiumCore();
    });

    it('应该能够注册和触发 IPC 处理器', () => {
      let receivedData: unknown = null;

      chromiumCore.onIPC('test-channel', (data) => {
        receivedData = data;
        return { received: true };
      });

      chromiumCore.sendIPC('test-channel', { message: 'hello' });

      expect(receivedData).toEqual({ message: 'hello' });
    });

    it('应该能够调用 IPC 并获取响应', async () => {
      chromiumCore.onIPC('calculate', (data) => {
        const { a, b } = data as { a: number; b: number };
        return { result: a + b };
      });

      const response = await chromiumCore.invokeIPC<{ result: number }>('calculate', { a: 1, b: 2 });

      expect(response.result).toBe(3);
    });

    it('应该能够取消 IPC 注册', () => {
      let callCount = 0;

      const unsubscribe = chromiumCore.onIPC('test', () => {
        callCount++;
      });

      chromiumCore.sendIPC('test', {});
      expect(callCount).toBe(1);

      unsubscribe();

      chromiumCore.sendIPC('test', {});
      expect(callCount).toBe(1); // 不再增加
    });

    it('应该能够获取平台信息', () => {
      const platform = chromiumCore.getPlatform();
      const userAgent = chromiumCore.getUserAgent();

      expect(typeof platform).toBe('string');
      expect(typeof userAgent).toBe('string');
    });
  });

  describe('RuntimeManager + ChromiumCore 集成', () => {
    it('应该能够通过 IPC 通信管理模块', async () => {
      const runtimeManager = new RuntimeManager();
      const chromiumCore = new ChromiumCore();

      // 注册模块管理 IPC
      chromiumCore.onIPC('module:register', async (data) => {
        const { moduleId } = data as { moduleId: string };
        const module = new TestModuleA();
        module.moduleId = moduleId;
        await runtimeManager.register(module);
        return { success: true };
      });

      chromiumCore.onIPC('module:load', async (data) => {
        const { moduleId } = data as { moduleId: string };
        await runtimeManager.load(moduleId);
        return { success: true, status: runtimeManager.getModuleStatus(moduleId) };
      });

      chromiumCore.onIPC('module:status', (data) => {
        const { moduleId } = data as { moduleId: string };
        return { status: runtimeManager.getModuleStatus(moduleId) };
      });

      // 通过 IPC 注册模块
      await chromiumCore.invokeIPC('module:register', { moduleId: 'ipc-module' });

      // 通过 IPC 加载模块
      const loadResult = await chromiumCore.invokeIPC<{ success: boolean; status: string }>(
        'module:load',
        { moduleId: 'ipc-module' }
      );

      expect(loadResult.success).toBe(true);
      expect(loadResult.status).toBe('loaded');

      // 通过 IPC 查询状态
      const statusResult = await chromiumCore.invokeIPC<{ status: string }>(
        'module:status',
        { moduleId: 'ipc-module' }
      );

      expect(statusResult.status).toBe('loaded');
    });
  });
});
