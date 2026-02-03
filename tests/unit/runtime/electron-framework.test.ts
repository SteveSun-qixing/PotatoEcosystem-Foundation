/**
 * ElectronFramework 单元测试
 * @module tests/unit/runtime/electron-framework.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ElectronFramework,
  electronFramework,
  WindowManager,
  windowManager,
  DialogManager,
  dialogManager,
  ClipboardManager,
  clipboardManager,
  IPCMainManager,
  ipcMainManager,
} from '../../../src/runtime/electron-framework';

// ============================================================================
// ElectronFramework 测试
// ============================================================================

describe('ElectronFramework', () => {
  let framework: ElectronFramework;

  beforeEach(() => {
    framework = new ElectronFramework();
  });

  describe('环境检测', () => {
    it('应该能检测是否在 Electron 环境', () => {
      const result = framework.isAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('应该能检测是否在主进程', () => {
      const result = framework.isMain();
      expect(typeof result).toBe('boolean');
    });

    it('应该能检测是否在渲染进程', () => {
      const result = framework.isRenderer();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('系统路径', () => {
    it('应该能获取应用路径', () => {
      const result = framework.getAppPath();
      expect(typeof result).toBe('string');
    });

    it('应该能获取用户数据路径', () => {
      const result = framework.getUserDataPath();
      expect(typeof result).toBe('string');
    });

    it('应该能获取桌面路径', () => {
      const result = framework.getDesktopPath();
      expect(typeof result).toBe('string');
    });

    it('应该能获取文档路径', () => {
      const result = framework.getDocumentsPath();
      expect(typeof result).toBe('string');
    });

    it('应该能获取下载路径', () => {
      const result = framework.getDownloadsPath();
      expect(typeof result).toBe('string');
    });

    it('应该能获取临时目录路径', () => {
      const result = framework.getTempPath();
      expect(typeof result).toBe('string');
    });
  });

  describe('系统信息', () => {
    it('应该能获取系统信息', () => {
      const info = framework.getSystemInfo();
      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('arch');
      expect(info).toHaveProperty('electronVersion');
      expect(info).toHaveProperty('chromeVersion');
      expect(info).toHaveProperty('nodeVersion');
    });

    it('应该能获取屏幕信息', () => {
      const info = framework.getScreenInfo();
      expect(info).toHaveProperty('width');
      expect(info).toHaveProperty('height');
      expect(info).toHaveProperty('scaleFactor');
    });
  });

  describe('应用信息', () => {
    it('应该能获取应用名称', () => {
      const name = framework.getName();
      expect(typeof name).toBe('string');
    });

    it('应该能获取应用版本', () => {
      const version = framework.getVersion();
      expect(typeof version).toBe('string');
    });
  });

  describe('剪贴板', () => {
    it('应该有剪贴板属性', () => {
      expect(framework.clipboard).toBeDefined();
    });
  });

  describe('IPC Main', () => {
    it('应该有 ipcMain 属性', () => {
      expect(framework.ipcMain).toBeDefined();
    });
  });
});

// ============================================================================
// WindowManager 测试
// ============================================================================

describe('WindowManager', () => {
  let manager: WindowManager;

  beforeEach(() => {
    manager = new WindowManager();
  });

  describe('窗口管理', () => {
    it('应该能获取所有窗口', () => {
      const windows = manager.getAllWindows();
      expect(Array.isArray(windows)).toBe(true);
    });

    it('应该能获取聚焦的窗口', () => {
      const window = manager.getFocusedWindow();
      // 在非 Electron 环境返回 null
      expect(window === null || typeof window === 'object').toBe(true);
    });

    it('应该返回 null 当窗口不存在', () => {
      const window = manager.getWindow(99999);
      expect(window).toBeNull();
    });
  });
});

// ============================================================================
// DialogManager 测试
// ============================================================================

describe('DialogManager', () => {
  let manager: DialogManager;

  beforeEach(() => {
    manager = new DialogManager();
  });

  describe('对话框', () => {
    // 注意：在 Node.js 测试环境中，浏览器 API 不可用
    // 这些测试主要验证实例创建和方法存在
    
    it('应该能创建 DialogManager 实例', () => {
      expect(manager).toBeInstanceOf(DialogManager);
    });

    it('应该有 showOpenDialog 方法', () => {
      expect(typeof manager.showOpenDialog).toBe('function');
    });

    it('应该有 showSaveDialog 方法', () => {
      expect(typeof manager.showSaveDialog).toBe('function');
    });

    it('应该有 showMessageBox 方法', () => {
      expect(typeof manager.showMessageBox).toBe('function');
    });

    it('应该有 showErrorBox 方法', () => {
      expect(typeof manager.showErrorBox).toBe('function');
    });
  });
});

// ============================================================================
// ClipboardManager 测试
// ============================================================================

describe('ClipboardManager', () => {
  let manager: ClipboardManager;

  beforeEach(() => {
    manager = new ClipboardManager();
  });

  describe('文本操作', () => {
    it('应该能读取文本', () => {
      const text = manager.readText();
      expect(typeof text).toBe('string');
    });

    it('应该能写入文本', () => {
      expect(() => manager.writeText('test')).not.toThrow();
    });

    it('应该能异步读取文本', async () => {
      const text = await manager.readTextAsync();
      expect(typeof text).toBe('string');
    });
  });

  describe('HTML 操作', () => {
    it('应该能读取 HTML', () => {
      const html = manager.readHTML();
      expect(typeof html).toBe('string');
    });

    it('应该能写入 HTML', () => {
      expect(() => manager.writeHTML('<p>test</p>')).not.toThrow();
    });
  });

  describe('其他操作', () => {
    it('应该能清空剪贴板', () => {
      expect(() => manager.clear()).not.toThrow();
    });

    it('应该能获取可用格式', () => {
      const formats = manager.availableFormats();
      expect(Array.isArray(formats)).toBe(true);
    });
  });
});

// ============================================================================
// IPCMainManager 测试
// ============================================================================

describe('IPCMainManager', () => {
  let manager: IPCMainManager;

  beforeEach(() => {
    manager = new IPCMainManager();
  });

  afterEach(() => {
    manager.removeAllListeners();
  });

  describe('事件监听', () => {
    it('应该能注册事件处理器', () => {
      const handler = vi.fn();
      expect(() => manager.on('test-channel', handler)).not.toThrow();
    });

    it('应该能注册单次事件处理器', () => {
      const handler = vi.fn();
      expect(() => manager.once('test-channel', handler)).not.toThrow();
    });

    it('应该能移除所有监听器', () => {
      const handler = vi.fn();
      manager.on('test-channel', handler);
      expect(() => manager.removeAllListeners('test-channel')).not.toThrow();
    });

    it('应该能移除所有通道的监听器', () => {
      const handler = vi.fn();
      manager.on('channel1', handler);
      manager.on('channel2', handler);
      expect(() => manager.removeAllListeners()).not.toThrow();
    });
  });

  describe('处理器', () => {
    it('应该能注册 handle 处理器', () => {
      const handler = vi.fn().mockResolvedValue('result');
      expect(() => manager.handle('test-invoke', handler)).not.toThrow();
    });

    it('应该能移除 handle 处理器', () => {
      const handler = vi.fn();
      manager.handle('test-invoke', handler);
      expect(() => manager.removeHandler('test-invoke')).not.toThrow();
    });
  });

  describe('模拟发送', () => {
    it('应该能模拟发送消息', () => {
      const handler = vi.fn();
      manager.on('test-channel', handler);
      manager.simulateSend('test-channel', 'data');
      expect(handler).toHaveBeenCalled();
    });

    it('应该能模拟调用', async () => {
      const handler = vi.fn().mockReturnValue('result');
      manager.handle('test-invoke', handler);
      const result = await manager.simulateInvoke('test-invoke', 'arg1', 'arg2');
      expect(result).toBe('result');
    });

    it('应该在没有处理器时抛出错误', async () => {
      await expect(manager.simulateInvoke('non-existent')).rejects.toThrow(
        'No handler for channel: non-existent'
      );
    });
  });
});

// ============================================================================
// 全局实例测试
// ============================================================================

describe('全局实例', () => {
  it('electronFramework 应该是 ElectronFramework 实例', () => {
    expect(electronFramework).toBeInstanceOf(ElectronFramework);
  });

  it('windowManager 应该是 WindowManager 实例', () => {
    expect(windowManager).toBeInstanceOf(WindowManager);
  });

  it('dialogManager 应该是 DialogManager 实例', () => {
    expect(dialogManager).toBeInstanceOf(DialogManager);
  });

  it('clipboardManager 应该是 ClipboardManager 实例', () => {
    expect(clipboardManager).toBeInstanceOf(ClipboardManager);
  });

  it('ipcMainManager 应该是 IPCMainManager 实例', () => {
    expect(ipcMainManager).toBeInstanceOf(IPCMainManager);
  });
});

// ============================================================================
// 便捷函数测试
// ============================================================================

describe('便捷函数', () => {
  it('应该导出 showOpenDialog', async () => {
    const { showOpenDialog } = await import('../../../src/runtime/electron-framework');
    expect(typeof showOpenDialog).toBe('function');
  });

  it('应该导出 showSaveDialog', async () => {
    const { showSaveDialog } = await import('../../../src/runtime/electron-framework');
    expect(typeof showSaveDialog).toBe('function');
  });

  it('应该导出 showMessageBox', async () => {
    const { showMessageBox } = await import('../../../src/runtime/electron-framework');
    expect(typeof showMessageBox).toBe('function');
  });

  it('应该导出 copyText', async () => {
    const { copyText } = await import('../../../src/runtime/electron-framework');
    expect(typeof copyText).toBe('function');
  });

  it('应该导出 pasteText', async () => {
    const { pasteText } = await import('../../../src/runtime/electron-framework');
    expect(typeof pasteText).toBe('function');
  });
});
