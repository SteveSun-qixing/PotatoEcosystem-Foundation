/**
 * ChromiumCore 单元测试
 * @module tests/unit/runtime/chromium-core.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ChromiumCore,
  chromiumCore,
  WebViewWrapper,
} from '../../../src/runtime/chromium-core';
import type { WebViewConfig, IWebView } from '../../../src/runtime/chromium-core';

// ============================================================================
// ChromiumCore 测试
// ============================================================================

describe('ChromiumCore', () => {
  let core: ChromiumCore;

  beforeEach(() => {
    core = new ChromiumCore();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      const config = core.getDefaultConfig();
      expect(config.nodeIntegration).toBe(false);
      expect(config.contextIsolation).toBe(true);
      expect(config.webSecurity).toBe(true);
    });

    it('应该支持自定义配置', () => {
      const customCore = new ChromiumCore({
        nodeIntegration: true,
        webSecurity: false,
      });
      const config = customCore.getDefaultConfig();
      expect(config.nodeIntegration).toBe(true);
      expect(config.webSecurity).toBe(false);
    });
  });

  describe('环境检测', () => {
    it('应该能检测是否在 Electron 环境', () => {
      const result = core.isElectron();
      expect(typeof result).toBe('boolean');
    });

    it('应该能检测是否在渲染进程', () => {
      const result = core.isRenderer();
      expect(typeof result).toBe('boolean');
    });

    it('应该能检测是否在主进程', () => {
      const result = core.isMain();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('版本信息', () => {
    it('应该能获取 Chromium 版本', () => {
      const version = core.getChromiumVersion();
      expect(typeof version).toBe('string');
    });

    it('应该能获取 V8 版本', () => {
      const version = core.getV8Version();
      expect(typeof version).toBe('string');
    });

    it('应该能获取 Node.js 版本', () => {
      const version = core.getNodeVersion();
      expect(typeof version).toBe('string');
    });

    it('应该能获取 Electron 版本', () => {
      const version = core.getElectronVersion();
      expect(typeof version).toBe('string');
    });
  });

  describe('平台信息', () => {
    it('应该能获取平台', () => {
      const platform = core.getPlatform();
      expect(typeof platform).toBe('string');
    });

    it('应该能获取用户代理', () => {
      const userAgent = core.getUserAgent();
      expect(typeof userAgent).toBe('string');
    });
  });

  describe('WebView 管理', () => {
    it('应该能获取所有 WebView', () => {
      const webViews = core.getAllWebViews();
      expect(Array.isArray(webViews)).toBe(true);
    });

    it('应该在 WebView 不存在时返回 null', () => {
      const webView = core.getWebView('non-existent');
      expect(webView).toBeNull();
    });

    it('应该能销毁不存在的 WebView 而不报错', () => {
      expect(() => core.destroyWebView('non-existent')).not.toThrow();
    });
  });

  describe('渲染进程通信', () => {
    it('应该能注册消息处理器', () => {
      const handler = vi.fn();
      const unsubscribe = core.onRendererMessage('test-channel', handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('应该能取消消息处理器', () => {
      const handler = vi.fn();
      const unsubscribe = core.onRendererMessage('test-channel', handler);
      expect(() => unsubscribe()).not.toThrow();
    });

    it('应该能处理来自渲染进程的消息', () => {
      const handler = vi.fn();
      core.onRendererMessage('test-channel', handler);
      core.handleRendererMessage('webview-1', {
        channel: 'test-channel',
        data: { foo: 'bar' },
      });
      expect(handler).toHaveBeenCalledWith('webview-1', { foo: 'bar' });
    });

    it('应该能处理处理器抛出的错误', () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      core.onRendererMessage('test-channel', handler);
      
      // 应该不会抛出错误
      expect(() => {
        core.handleRendererMessage('webview-1', {
          channel: 'test-channel',
          data: {},
        });
      }).not.toThrow();
    });
  });

  describe('DevTools', () => {
    it('应该能打开 DevTools（不存在的 WebView）', () => {
      expect(() => core.openDevTools('non-existent')).not.toThrow();
    });

    it('应该能关闭 DevTools（不存在的 WebView）', () => {
      expect(() => core.closeDevTools('non-existent')).not.toThrow();
    });
  });
});

// ============================================================================
// WebViewWrapper 测试（模拟 DOM 环境）
// ============================================================================

describe('WebViewWrapper', () => {
  // 注意：WebViewWrapper 需要 DOM 环境
  // 在 Node.js 环境中只能测试部分功能
  
  describe('类型定义', () => {
    it('应该导出 WebViewWrapper 类', () => {
      expect(WebViewWrapper).toBeDefined();
    });

    it('应该有正确的方法签名', () => {
      // 检查类的原型上是否有预期的方法
      expect(typeof WebViewWrapper.prototype.loadURL).toBe('function');
      expect(typeof WebViewWrapper.prototype.loadHTML).toBe('function');
      expect(typeof WebViewWrapper.prototype.reload).toBe('function');
      expect(typeof WebViewWrapper.prototype.stop).toBe('function');
      expect(typeof WebViewWrapper.prototype.goBack).toBe('function');
      expect(typeof WebViewWrapper.prototype.goForward).toBe('function');
      expect(typeof WebViewWrapper.prototype.getURL).toBe('function');
      expect(typeof WebViewWrapper.prototype.getTitle).toBe('function');
      expect(typeof WebViewWrapper.prototype.isLoading).toBe('function');
      expect(typeof WebViewWrapper.prototype.executeJavaScript).toBe('function');
      expect(typeof WebViewWrapper.prototype.insertCSS).toBe('function');
      expect(typeof WebViewWrapper.prototype.setZoomFactor).toBe('function');
      expect(typeof WebViewWrapper.prototype.getZoomFactor).toBe('function');
      expect(typeof WebViewWrapper.prototype.openDevTools).toBe('function');
      expect(typeof WebViewWrapper.prototype.closeDevTools).toBe('function');
      expect(typeof WebViewWrapper.prototype.destroy).toBe('function');
    });
  });
});

// ============================================================================
// 全局实例测试
// ============================================================================

describe('全局实例', () => {
  it('chromiumCore 应该是 ChromiumCore 实例', () => {
    expect(chromiumCore).toBeInstanceOf(ChromiumCore);
  });

  it('chromiumCore 应该是单例', async () => {
    const module1 = await import('../../../src/runtime/chromium-core');
    const module2 = await import('../../../src/runtime/chromium-core');
    expect(module1.chromiumCore).toBe(module2.chromiumCore);
  });
});

// ============================================================================
// 类型导出测试
// ============================================================================

describe('类型导出', () => {
  it('应该导出必要的类型', async () => {
    const module = await import('../../../src/runtime/chromium-core');
    
    // 验证类导出
    expect(module.ChromiumCore).toBeDefined();
    expect(module.WebViewWrapper).toBeDefined();
    expect(module.chromiumCore).toBeDefined();
  });
});
