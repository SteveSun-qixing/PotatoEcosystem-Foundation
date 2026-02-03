/**
 * DesktopLauncher 单元测试
 * @module tests/unit/runtime/desktop-launcher.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DesktopLauncher,
  launchDesktopApp,
  IPCBridge,
  ipcBridge,
  DesktopIPCChannels,
  createDefaultConfig,
} from '../../../src/runtime/desktop-launcher';
import type {
  DesktopAppConfig,
  WindowConfig,
  MenuConfig,
  TrayConfig,
} from '../../../src/runtime/desktop-launcher';

// ============================================================================
// DesktopLauncher 测试
// ============================================================================

describe('DesktopLauncher', () => {
  describe('构造函数', () => {
    it('应该能创建启动器实例', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {
          width: 800,
          height: 600,
        },
      };

      const launcher = new DesktopLauncher(config);
      expect(launcher).toBeInstanceOf(DesktopLauncher);
    });

    it('应该能获取配置', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {
          width: 800,
          height: 600,
        },
      };

      const launcher = new DesktopLauncher(config);
      const retrievedConfig = launcher.getConfig();

      expect(retrievedConfig.appId).toBe('test-app');
      expect(retrievedConfig.name).toBe('Test Application');
      expect(retrievedConfig.version).toBe('1.0.0');
    });
  });

  describe('状态检查', () => {
    it('应该在启动前返回未就绪状态', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      expect(launcher.isReady()).toBe(false);
    });

    it('应该在启动前返回 null 主窗口', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      expect(launcher.getMainWindow()).toBeNull();
    });
  });

  describe('事件系统', () => {
    it('应该能注册事件处理器', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      const handler = vi.fn();

      const unsubscribe = launcher.on('ready', handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('应该能取消事件监听', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      const handler = vi.fn();

      const unsubscribe = launcher.on('ready', handler);
      unsubscribe();
      // 无法直接验证，但不应该抛出错误
    });

    it('应该能注册单次事件处理器', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      const handler = vi.fn();

      expect(() => launcher.once('ready', handler)).not.toThrow();
    });
  });

  describe('IPC 处理器', () => {
    it('应该能注册 IPC 处理器', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      const handler = vi.fn();

      expect(() => {
        launcher.registerIpcHandler('test-channel', handler);
      }).not.toThrow();
    });

    it('应该能移除 IPC 处理器', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      const handler = vi.fn();

      launcher.registerIpcHandler('test-channel', handler);
      expect(() => {
        launcher.removeIpcHandler('test-channel');
      }).not.toThrow();
    });
  });

  describe('窗口管理', () => {
    it('应该返回空的窗口列表', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      const windows = launcher.getAllWindows();
      expect(Array.isArray(windows)).toBe(true);
      expect(windows.length).toBe(0);
    });

    it('应该返回 null 当窗口不存在', () => {
      const config: DesktopAppConfig = {
        appId: 'test-app',
        name: 'Test Application',
        version: '1.0.0',
        window: {},
      };

      const launcher = new DesktopLauncher(config);
      const window = launcher.getWindow(99999);
      expect(window).toBeNull();
    });
  });
});

// ============================================================================
// IPCBridge 测试
// ============================================================================

describe('IPCBridge', () => {
  let bridge: IPCBridge;

  beforeEach(() => {
    bridge = new IPCBridge();
  });

  afterEach(() => {
    bridge.destroy();
  });

  describe('处理器管理', () => {
    it('应该能注册处理器', () => {
      const handler = vi.fn();
      expect(() => bridge.handle('test-channel', handler)).not.toThrow();
    });

    it('应该能移除处理器', () => {
      const handler = vi.fn();
      bridge.handle('test-channel', handler);
      expect(() => bridge.removeHandler('test-channel')).not.toThrow();
    });

    it('应该能批量注册处理器', () => {
      const configs = [
        { channel: 'channel-1', handler: vi.fn() },
        { channel: 'channel-2', handler: vi.fn() },
      ];
      expect(() => bridge.registerHandlers(configs)).not.toThrow();
    });

    it('应该能批量移除处理器', () => {
      const configs = [
        { channel: 'channel-1', handler: vi.fn() },
        { channel: 'channel-2', handler: vi.fn() },
      ];
      bridge.registerHandlers(configs);
      expect(() => bridge.removeHandlers(['channel-1', 'channel-2'])).not.toThrow();
    });

    it('应该能获取已注册的通道列表', () => {
      bridge.handle('channel-1', vi.fn());
      bridge.handle('channel-2', vi.fn());

      const channels = bridge.getRegisteredChannels();
      expect(channels).toContain('channel-1');
      expect(channels).toContain('channel-2');
    });

    it('应该能检查处理器是否存在', () => {
      bridge.handle('exists', vi.fn());

      expect(bridge.hasHandler('exists')).toBe(true);
      expect(bridge.hasHandler('not-exists')).toBe(false);
    });
  });

  describe('销毁', () => {
    it('应该能销毁并清理所有处理器', () => {
      bridge.handle('channel-1', vi.fn());
      bridge.handle('channel-2', vi.fn());

      bridge.destroy();

      expect(bridge.getRegisteredChannels().length).toBe(0);
    });
  });
});

// ============================================================================
// DesktopIPCChannels 测试
// ============================================================================

describe('DesktopIPCChannels', () => {
  it('应该定义应用控制通道', () => {
    expect(DesktopIPCChannels.APP_QUIT).toBeDefined();
    expect(DesktopIPCChannels.APP_RELAUNCH).toBeDefined();
    expect(DesktopIPCChannels.APP_GET_INFO).toBeDefined();
    expect(DesktopIPCChannels.APP_GET_PATH).toBeDefined();
  });

  it('应该定义窗口操作通道', () => {
    expect(DesktopIPCChannels.WINDOW_MINIMIZE).toBeDefined();
    expect(DesktopIPCChannels.WINDOW_MAXIMIZE).toBeDefined();
    expect(DesktopIPCChannels.WINDOW_CLOSE).toBeDefined();
    expect(DesktopIPCChannels.WINDOW_CENTER).toBeDefined();
  });

  it('应该定义对话框通道', () => {
    expect(DesktopIPCChannels.DIALOG_OPEN_FILE).toBeDefined();
    expect(DesktopIPCChannels.DIALOG_SAVE_FILE).toBeDefined();
    expect(DesktopIPCChannels.DIALOG_MESSAGE_BOX).toBeDefined();
  });

  it('应该定义剪贴板通道', () => {
    expect(DesktopIPCChannels.CLIPBOARD_READ_TEXT).toBeDefined();
    expect(DesktopIPCChannels.CLIPBOARD_WRITE_TEXT).toBeDefined();
    expect(DesktopIPCChannels.CLIPBOARD_CLEAR).toBeDefined();
  });

  it('应该定义系统信息通道', () => {
    expect(DesktopIPCChannels.SYSTEM_GET_INFO).toBeDefined();
    expect(DesktopIPCChannels.SYSTEM_GET_SCREEN_INFO).toBeDefined();
  });
});

// ============================================================================
// createDefaultConfig 测试
// ============================================================================

describe('createDefaultConfig', () => {
  it('应该创建默认配置', () => {
    const config = createDefaultConfig({});

    expect(config.appId).toBe('com.chips.app');
    expect(config.name).toBe('Chips Application');
    expect(config.version).toBe('1.0.0');
    expect(config.singleInstance).toBe(true);
  });

  it('应该允许覆盖默认配置', () => {
    const config = createDefaultConfig({
      appId: 'custom-app',
      name: 'Custom App',
      version: '2.0.0',
    });

    expect(config.appId).toBe('custom-app');
    expect(config.name).toBe('Custom App');
    expect(config.version).toBe('2.0.0');
  });

  it('应该包含窗口配置', () => {
    const config = createDefaultConfig({});

    expect(config.window).toBeDefined();
    expect(config.window.width).toBe(1200);
    expect(config.window.height).toBe(800);
  });

  it('应该根据环境变量设置开发模式', () => {
    const originalEnv = process.env.NODE_ENV;
    
    process.env.NODE_ENV = 'development';
    const devConfig = createDefaultConfig({});
    expect(devConfig.isDev).toBe(true);

    process.env.NODE_ENV = 'production';
    const prodConfig = createDefaultConfig({});
    expect(prodConfig.isDev).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });
});

// ============================================================================
// launchDesktopApp 测试
// ============================================================================

describe('launchDesktopApp', () => {
  it('应该导出 launchDesktopApp 函数', () => {
    expect(typeof launchDesktopApp).toBe('function');
  });

  it('应该在非 Electron 环境抛出错误', async () => {
    const config: DesktopAppConfig = {
      appId: 'test-app',
      name: 'Test Application',
      version: '1.0.0',
      window: {},
    };

    await expect(launchDesktopApp(config)).rejects.toThrow(
      'Electron is not available'
    );
  });
});

// ============================================================================
// 全局实例测试
// ============================================================================

describe('全局实例', () => {
  it('ipcBridge 应该是 IPCBridge 实例', () => {
    expect(ipcBridge).toBeInstanceOf(IPCBridge);
  });
});

// ============================================================================
// 类型导出测试
// ============================================================================

describe('类型导出', () => {
  it('应该导出必要的类和函数', async () => {
    const module = await import('../../../src/runtime/desktop-launcher');

    expect(module.DesktopLauncher).toBeDefined();
    expect(module.launchDesktopApp).toBeDefined();
    expect(module.IPCBridge).toBeDefined();
    expect(module.ipcBridge).toBeDefined();
    expect(module.DesktopIPCChannels).toBeDefined();
    expect(module.createDefaultConfig).toBeDefined();
  });
});

// ============================================================================
// WindowConfig 测试
// ============================================================================

describe('WindowConfig', () => {
  it('应该支持基本窗口配置', () => {
    const config: WindowConfig = {
      width: 800,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      maxWidth: 1920,
      maxHeight: 1080,
      x: 100,
      y: 100,
      center: true,
      title: 'Test Window',
      frame: true,
      resizable: true,
    };

    expect(config.width).toBe(800);
    expect(config.height).toBe(600);
    expect(config.title).toBe('Test Window');
  });

  it('应该支持高级窗口配置', () => {
    const config: WindowConfig = {
      transparent: true,
      fullscreen: false,
      fullscreenable: true,
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      show: false,
      alwaysOnTop: true,
      titleBarStyle: 'hidden',
    };

    expect(config.transparent).toBe(true);
    expect(config.backgroundColor).toBe('#ffffff');
    expect(config.titleBarStyle).toBe('hidden');
  });
});

// ============================================================================
// MenuConfig 测试
// ============================================================================

describe('MenuConfig', () => {
  it('应该支持菜单配置', () => {
    const config: MenuConfig = {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N' },
        { type: 'separator' },
        { label: 'Quit', role: 'quit' },
      ],
    };

    expect(config.label).toBe('File');
    expect(config.submenu?.length).toBe(3);
  });
});

// ============================================================================
// TrayConfig 测试
// ============================================================================

describe('TrayConfig', () => {
  it('应该支持托盘配置', () => {
    const config: TrayConfig = {
      icon: '/path/to/icon.png',
      tooltip: 'My App',
      menu: [
        { label: 'Show', click: () => {} },
        { type: 'separator' },
        { label: 'Quit', click: () => {} },
      ],
      onClick: () => {},
      onDoubleClick: () => {},
    };

    expect(config.icon).toBe('/path/to/icon.png');
    expect(config.tooltip).toBe('My App');
    expect(config.menu?.length).toBe(3);
  });
});
