/**
 * DesktopLauncher 桌面启动器
 * @module @chips/foundation/runtime/desktop-launcher/desktop-launcher
 *
 * 为上层应用提供统一的桌面启动入口
 */

import { join } from 'path';
import type { IBrowserWindow, IpcHandler } from '../electron-framework/types';
import { electronFramework } from '../electron-framework';
import type {
  DesktopAppConfig,
  WindowConfig,
  IDesktopLauncher,
  LauncherEventType,
  LauncherEventHandler,
  toElectronWindowConfig,
} from './types';
import { IPCBridge, ipcBridge } from './ipc-bridge';

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 检查 Electron 是否可用
 */
function isElectronAvailable(): boolean {
  return typeof process !== 'undefined' && 'electron' in (process.versions ?? {});
}

/**
 * 获取 Electron 模块
 */
function getElectron(): typeof import('electron') | null {
  if (!isElectronAvailable()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('electron');
  } catch {
    return null;
  }
}

/**
 * 转换 WindowConfig 到 Electron 窗口选项
 */
function convertWindowConfig(config: WindowConfig, preload?: string): Electron.BrowserWindowConstructorOptions {
  return {
    width: config.width ?? 1200,
    height: config.height ?? 800,
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    maxWidth: config.maxWidth,
    maxHeight: config.maxHeight,
    x: config.x,
    y: config.y,
    center: config.center ?? true,
    title: config.title ?? 'Chips Application',
    frame: config.frame ?? true,
    transparent: config.transparent ?? false,
    resizable: config.resizable ?? true,
    fullscreen: config.fullscreen ?? false,
    fullscreenable: config.fullscreenable ?? true,
    autoHideMenuBar: config.autoHideMenuBar ?? false,
    backgroundColor: config.backgroundColor ?? '#ffffff',
    show: false, // 总是先隐藏，等 ready-to-show 再显示
    skipTaskbar: config.skipTaskbar,
    alwaysOnTop: config.alwaysOnTop,
    focusable: config.focusable,
    icon: config.icon,
    titleBarStyle: config.titleBarStyle,
    titleBarOverlay: config.titleBarOverlay,
    trafficLightPosition: config.trafficLightPosition,
    vibrancy: config.vibrancy as Electron.BrowserWindowConstructorOptions['vibrancy'],
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  };
}

// ============================================================================
// DesktopLauncher 实现
// ============================================================================

/**
 * DesktopLauncher 桌面启动器
 * 为上层应用提供统一的桌面运行环境
 */
export class DesktopLauncher implements IDesktopLauncher {
  private config: DesktopAppConfig;
  private mainWindow: IBrowserWindow | null = null;
  private windows: Map<number, IBrowserWindow> = new Map();
  private ipcBridge: IPCBridge;
  private eventHandlers: Map<LauncherEventType, Set<LauncherEventHandler>> = new Map();
  private ready: boolean = false;
  private electron: typeof import('electron') | null = null;

  /**
   * 创建桌面启动器
   * @param config 桌面应用配置
   */
  constructor(config: DesktopAppConfig) {
    this.config = config;
    this.ipcBridge = ipcBridge;
    this.electron = getElectron();
  }

  // ========== 生命周期 ==========

  /**
   * 启动桌面应用
   */
  async launch(): Promise<void> {
    if (!this.electron) {
      throw new Error('Electron is not available. DesktopLauncher can only be used in Electron main process.');
    }

    const { app, BrowserWindow } = this.electron;

    // 禁用硬件加速（如果配置了）
    if (this.config.disableHardwareAcceleration) {
      app.disableHardwareAcceleration();
    }

    // 设置用户数据目录
    if (this.config.userDataPath) {
      app.setPath('userData', this.config.userDataPath);
    }

    // 单例模式
    if (this.config.singleInstance) {
      const gotTheLock = app.requestSingleInstanceLock();

      if (!gotTheLock) {
        app.quit();
        return;
      }

      app.on('second-instance', () => {
        // 如果用户尝试打开第二个实例，聚焦到现有窗口
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
          }
          this.mainWindow.focus();
        }
        this.emit('second-instance');
      });
    }

    // 等待应用就绪
    await app.whenReady();

    // 初始化 IPC 桥接
    this.ipcBridge.initialize();

    // 创建主窗口
    await this.createMainWindow();

    // 设置应用菜单
    this.setupMenu();

    // 设置系统托盘
    this.setupTray();

    // 注册自定义协议
    if (this.config.protocol) {
      this.registerProtocol(this.config.protocol);
    }

    // 绑定应用事件
    this.bindAppEvents();

    this.ready = true;
    this.emit('ready');

    this.log('Desktop application launched successfully');
  }

  /**
   * 退出应用
   */
  quit(): void {
    if (this.electron) {
      this.electron.app.quit();
    }
  }

  /**
   * 重启应用
   */
  relaunch(): void {
    if (this.electron) {
      this.electron.app.relaunch();
      this.electron.app.quit();
    }
  }

  // ========== 窗口管理 ==========

  /**
   * 获取主窗口
   */
  getMainWindow(): IBrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * 创建新窗口
   */
  async createWindow(config: WindowConfig): Promise<IBrowserWindow> {
    const window = await electronFramework.createWindow({
      ...convertWindowConfig(config, this.config.preload),
      webPreferences: {
        preload: this.config.preload,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    this.windows.set(window.id, window);

    // 监听窗口关闭
    window.on('closed', () => {
      this.windows.delete(window.id);
      this.emit('window-closed', window.id);
    });

    this.emit('window-created', window.id);

    return window;
  }

  /**
   * 获取窗口
   */
  getWindow(windowId: number): IBrowserWindow | null {
    return this.windows.get(windowId) ?? null;
  }

  /**
   * 获取所有窗口
   */
  getAllWindows(): IBrowserWindow[] {
    return Array.from(this.windows.values());
  }

  // ========== IPC 通信 ==========

  /**
   * 注册 IPC 处理器
   */
  registerIpcHandler(channel: string, handler: IpcHandler): void {
    this.ipcBridge.handle(channel, handler);
  }

  /**
   * 移除 IPC 处理器
   */
  removeIpcHandler(channel: string): void {
    this.ipcBridge.removeHandler(channel);
  }

  /**
   * 发送消息到渲染进程（主窗口）
   */
  sendToRenderer(channel: string, ...args: unknown[]): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  /**
   * 发送消息到指定窗口
   */
  sendToWindow(windowId: number, channel: string, ...args: unknown[]): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.webContents.send(channel, ...args);
    }
  }

  // ========== 事件 ==========

  /**
   * 监听事件
   */
  on(event: LauncherEventType, handler: LauncherEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * 单次监听事件
   */
  once(event: LauncherEventType, handler: LauncherEventHandler): void {
    const onceHandler: LauncherEventHandler = (...args) => {
      this.eventHandlers.get(event)?.delete(onceHandler);
      handler(...args);
    };

    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(onceHandler);
  }

  // ========== 状态 ==========

  /**
   * 是否就绪
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * 获取配置
   */
  getConfig(): DesktopAppConfig {
    return { ...this.config };
  }

  // ========== 私有方法 ==========

  /**
   * 创建主窗口
   */
  private async createMainWindow(): Promise<void> {
    if (!this.electron) {
      return;
    }

    const { BrowserWindow, shell } = this.electron;

    // 获取预加载脚本路径
    const preloadPath = this.config.preload;

    // 创建窗口
    const windowOptions = convertWindowConfig(this.config.window, preloadPath);
    const window = new BrowserWindow(windowOptions);

    // 包装为 IBrowserWindow
    this.mainWindow = {
      id: window.id,
      show: () => window.show(),
      hide: () => window.hide(),
      close: () => window.close(),
      destroy: () => window.destroy(),
      focus: () => window.focus(),
      blur: () => window.blur(),
      minimize: () => window.minimize(),
      maximize: () => window.maximize(),
      unmaximize: () => window.unmaximize(),
      restore: () => window.restore(),
      isMinimized: () => window.isMinimized(),
      isMaximized: () => window.isMaximized(),
      isVisible: () => window.isVisible(),
      isFocused: () => window.isFocused(),
      isDestroyed: () => window.isDestroyed(),
      isFullScreen: () => window.isFullScreen(),
      setFullScreen: (flag: boolean) => window.setFullScreen(flag),
      setBounds: (bounds) => window.setBounds(bounds),
      getBounds: () => window.getBounds(),
      setPosition: (x, y) => window.setPosition(x, y),
      getPosition: () => window.getPosition() as [number, number],
      setSize: (width, height) => window.setSize(width, height),
      getSize: () => window.getSize() as [number, number],
      center: () => window.center(),
      setContentSize: (width, height) => window.setContentSize(width, height),
      getContentSize: () => window.getContentSize() as [number, number],
      setMinimumSize: (width, height) => window.setMinimumSize(width, height),
      getMinimumSize: () => window.getMinimumSize() as [number, number],
      setMaximumSize: (width, height) => window.setMaximumSize(width, height),
      getMaximumSize: () => window.getMaximumSize() as [number, number],
      setResizable: (resizable) => window.setResizable(resizable),
      isResizable: () => window.isResizable(),
      setTitle: (title) => window.setTitle(title),
      getTitle: () => window.getTitle(),
      loadURL: async (url) => { await window.loadURL(url); },
      loadFile: async (filePath) => { await window.loadFile(filePath); },
      reload: () => window.reload(),
      on: (event, handler) => {
        window.on(event as Parameters<typeof window.on>[0], handler);
        return () => window.off(event as Parameters<typeof window.off>[0], handler);
      },
      once: (event, handler) => {
        window.once(event as Parameters<typeof window.once>[0], handler);
      },
      webContents: {
        id: window.webContents.id,
        send: (channel, ...args) => window.webContents.send(channel, ...args),
        executeJavaScript: (code) => window.webContents.executeJavaScript(code),
        insertCSS: (css) => window.webContents.insertCSS(css),
        removeInsertedCSS: (key) => window.webContents.removeInsertedCSS(key),
        openDevTools: () => window.webContents.openDevTools(),
        closeDevTools: () => window.webContents.closeDevTools(),
        isDevToolsOpened: () => window.webContents.isDevToolsOpened(),
        toggleDevTools: () => window.webContents.toggleDevTools(),
        getURL: () => window.webContents.getURL(),
        getTitle: () => window.webContents.getTitle(),
        isLoading: () => window.webContents.isLoading(),
        isWaitingForResponse: () => window.webContents.isWaitingForResponse(),
        stop: () => window.webContents.stop(),
        reload: () => window.webContents.reload(),
        canGoBack: () => window.webContents.canGoBack(),
        canGoForward: () => window.webContents.canGoForward(),
        goBack: () => window.webContents.goBack(),
        goForward: () => window.webContents.goForward(),
        setZoomLevel: (level) => window.webContents.setZoomLevel(level),
        getZoomLevel: () => window.webContents.getZoomLevel(),
        setZoomFactor: (factor) => window.webContents.setZoomFactor(factor),
        getZoomFactor: () => window.webContents.getZoomFactor(),
        print: (options) => window.webContents.print(options as Electron.WebContentsPrintOptions),
        printToPDF: (options) => window.webContents.printToPDF(options as Electron.PrintToPDFOptions),
      },
    };

    this.windows.set(window.id, this.mainWindow);

    // 准备好后显示窗口
    window.on('ready-to-show', () => {
      window.show();
    });

    // 处理外部链接
    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    // 加载页面
    if (this.config.isDev && this.config.devServerUrl) {
      await window.loadURL(this.config.devServerUrl);
      // 开发环境打开开发者工具
      window.webContents.openDevTools();
    } else if (this.config.productionHtml) {
      await window.loadFile(this.config.productionHtml);
    } else if (this.config.rendererEntry) {
      await window.loadFile(this.config.rendererEntry);
    }

    // 窗口关闭时清理
    window.on('closed', () => {
      this.mainWindow = null;
      this.windows.delete(window.id);
    });
  }

  /**
   * 设置应用菜单
   */
  private setupMenu(): void {
    if (!this.electron || !this.config.menu) {
      return;
    }

    const { Menu } = this.electron;

    // 将配置转换为 Electron 菜单模板
    const template = this.config.menu.map((menuConfig) => ({
      label: menuConfig.label,
      role: menuConfig.role as Electron.MenuItemConstructorOptions['role'],
      submenu: menuConfig.submenu?.map((item) => ({
        label: item.label,
        accelerator: item.accelerator,
        role: item.role as Electron.MenuItemConstructorOptions['role'],
        type: item.type as Electron.MenuItemConstructorOptions['type'],
        enabled: item.enabled,
        visible: item.visible,
        checked: item.checked,
        click: item.click,
      })),
    }));

    const menu = Menu.buildFromTemplate(template as Electron.MenuItemConstructorOptions[]);
    Menu.setApplicationMenu(menu);
  }

  /**
   * 设置系统托盘
   */
  private setupTray(): void {
    if (!this.electron || !this.config.tray) {
      return;
    }

    const { Tray, Menu } = this.electron;
    const trayConfig = this.config.tray;

    const tray = new Tray(trayConfig.icon);

    if (trayConfig.tooltip) {
      tray.setToolTip(trayConfig.tooltip);
    }

    if (trayConfig.menu) {
      const contextMenu = Menu.buildFromTemplate(
        trayConfig.menu.map((item) => ({
          label: item.label,
          type: item.type as Electron.MenuItemConstructorOptions['type'],
          click: item.click,
        }))
      );
      tray.setContextMenu(contextMenu);
    }

    if (trayConfig.onClick) {
      tray.on('click', trayConfig.onClick);
    }

    if (trayConfig.onDoubleClick) {
      tray.on('double-click', trayConfig.onDoubleClick);
    }

    if (trayConfig.onRightClick) {
      tray.on('right-click', trayConfig.onRightClick);
    }
  }

  /**
   * 注册自定义协议
   */
  private registerProtocol(protocol: string): void {
    if (!this.electron) {
      return;
    }

    const { protocol: electronProtocol } = this.electron;

    electronProtocol.handle(protocol, async (request) => {
      // 默认处理：返回 404
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    });
  }

  /**
   * 绑定应用事件
   */
  private bindAppEvents(): void {
    if (!this.electron) {
      return;
    }

    const { app, BrowserWindow } = this.electron;

    // macOS: 点击 dock 图标时重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
      this.emit('activate');
    });

    // 所有窗口关闭时
    app.on('window-all-closed', () => {
      this.emit('window-all-closed');

      // macOS：除非用户用 Cmd + Q 确定退出，否则保持应用活动
      if (process.platform !== 'darwin' && !this.config.runInBackground) {
        app.quit();
      }
    });

    // 退出前
    app.on('before-quit', () => {
      this.emit('before-quit');
    });

    // 将要退出
    app.on('will-quit', () => {
      this.emit('will-quit');
    });

    // 已退出
    app.on('quit', () => {
      this.emit('quit');
    });
  }

  /**
   * 触发事件
   */
  private emit(event: LauncherEventType, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error in launcher event handler for ${event}:`, error);
        }
      }
    }
  }

  /**
   * 日志
   */
  private log(message: string): void {
    if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
      // eslint-disable-next-line no-console
      console.log(`[DesktopLauncher] ${message}`);
    }
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速启动桌面应用
 * @param config 桌面应用配置
 * @returns 桌面启动器实例
 */
export async function launchDesktopApp(config: DesktopAppConfig): Promise<DesktopLauncher> {
  const launcher = new DesktopLauncher(config);
  await launcher.launch();
  return launcher;
}
