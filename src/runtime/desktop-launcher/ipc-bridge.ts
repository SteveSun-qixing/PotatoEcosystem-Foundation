/**
 * IPC Bridge IPC 桥接
 * @module @chips/foundation/runtime/desktop-launcher/ipc-bridge
 *
 * 提供主进程和渲染进程之间的 IPC 通信桥接
 */

import type { IpcHandler } from '../electron-framework/types';
import type { IpcHandlerConfig } from './types';

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

// ============================================================================
// 预定义 IPC 通道
// ============================================================================

/**
 * 预定义的 IPC 通道常量
 */
export const DesktopIPCChannels = {
  // 应用控制
  APP_QUIT: 'desktop:app:quit',
  APP_RELAUNCH: 'desktop:app:relaunch',
  APP_GET_INFO: 'desktop:app:getInfo',
  APP_GET_PATH: 'desktop:app:getPath',
  APP_SET_PATH: 'desktop:app:setPath',

  // 窗口操作
  WINDOW_MINIMIZE: 'desktop:window:minimize',
  WINDOW_MAXIMIZE: 'desktop:window:maximize',
  WINDOW_UNMAXIMIZE: 'desktop:window:unmaximize',
  WINDOW_CLOSE: 'desktop:window:close',
  WINDOW_RESTORE: 'desktop:window:restore',
  WINDOW_SET_TITLE: 'desktop:window:setTitle',
  WINDOW_SET_SIZE: 'desktop:window:setSize',
  WINDOW_SET_POSITION: 'desktop:window:setPosition',
  WINDOW_CENTER: 'desktop:window:center',
  WINDOW_SET_FULLSCREEN: 'desktop:window:setFullscreen',
  WINDOW_IS_MAXIMIZED: 'desktop:window:isMaximized',
  WINDOW_IS_MINIMIZED: 'desktop:window:isMinimized',
  WINDOW_IS_FULLSCREEN: 'desktop:window:isFullscreen',

  // 对话框
  DIALOG_OPEN_FILE: 'desktop:dialog:openFile',
  DIALOG_OPEN_DIRECTORY: 'desktop:dialog:openDirectory',
  DIALOG_SAVE_FILE: 'desktop:dialog:saveFile',
  DIALOG_MESSAGE_BOX: 'desktop:dialog:messageBox',

  // Shell 操作
  SHELL_OPEN_EXTERNAL: 'desktop:shell:openExternal',
  SHELL_OPEN_PATH: 'desktop:shell:openPath',
  SHELL_SHOW_ITEM_IN_FOLDER: 'desktop:shell:showItemInFolder',
  SHELL_TRASH_ITEM: 'desktop:shell:trashItem',
  SHELL_BEEP: 'desktop:shell:beep',

  // 剪贴板
  CLIPBOARD_READ_TEXT: 'desktop:clipboard:readText',
  CLIPBOARD_WRITE_TEXT: 'desktop:clipboard:writeText',
  CLIPBOARD_READ_HTML: 'desktop:clipboard:readHTML',
  CLIPBOARD_WRITE_HTML: 'desktop:clipboard:writeHTML',
  CLIPBOARD_CLEAR: 'desktop:clipboard:clear',

  // 系统信息
  SYSTEM_GET_INFO: 'desktop:system:getInfo',
  SYSTEM_GET_SCREEN_INFO: 'desktop:system:getScreenInfo',

  // 通知
  NOTIFICATION_SHOW: 'desktop:notification:show',

  // 主题
  THEME_GET_NATIVE: 'desktop:theme:getNative',
  THEME_SHOULD_USE_DARK: 'desktop:theme:shouldUseDark',
} as const;

export type DesktopIPCChannel = (typeof DesktopIPCChannels)[keyof typeof DesktopIPCChannels];

// ============================================================================
// IPC Bridge 类
// ============================================================================

/**
 * IPC Bridge
 * 管理主进程和渲染进程之间的 IPC 通信
 */
export class IPCBridge {
  private handlers: Map<string, IpcHandler> = new Map();
  private electron: typeof import('electron') | null = null;

  constructor() {
    this.electron = getElectron();
  }

  /**
   * 初始化 IPC 桥接
   * 注册默认处理器
   */
  initialize(): void {
    if (!this.electron) {
      return;
    }

    // 注册默认处理器
    this.registerDefaultHandlers();
  }

  /**
   * 注册默认处理器
   */
  private registerDefaultHandlers(): void {
    if (!this.electron) {
      return;
    }

    const { app, shell, clipboard, dialog, nativeTheme, BrowserWindow } = this.electron;

    // 应用控制
    this.handle(DesktopIPCChannels.APP_QUIT, () => {
      app.quit();
    });

    this.handle(DesktopIPCChannels.APP_RELAUNCH, () => {
      app.relaunch();
      app.quit();
    });

    this.handle(DesktopIPCChannels.APP_GET_INFO, () => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        isPackaged: app.isPackaged,
        locale: app.getLocale(),
      };
    });

    this.handle(DesktopIPCChannels.APP_GET_PATH, (_event, name: string) => {
      return app.getPath(name as Parameters<typeof app.getPath>[0]);
    });

    // 窗口操作
    this.handle(DesktopIPCChannels.WINDOW_MINIMIZE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.minimize();
    });

    this.handle(DesktopIPCChannels.WINDOW_MAXIMIZE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.maximize();
    });

    this.handle(DesktopIPCChannels.WINDOW_UNMAXIMIZE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.unmaximize();
    });

    this.handle(DesktopIPCChannels.WINDOW_CLOSE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.close();
    });

    this.handle(DesktopIPCChannels.WINDOW_RESTORE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.restore();
    });

    this.handle(DesktopIPCChannels.WINDOW_SET_TITLE, (event, title: string) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setTitle(title);
    });

    this.handle(DesktopIPCChannels.WINDOW_SET_SIZE, (event, width: number, height: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setSize(width, height);
    });

    this.handle(DesktopIPCChannels.WINDOW_SET_POSITION, (event, x: number, y: number) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setPosition(x, y);
    });

    this.handle(DesktopIPCChannels.WINDOW_CENTER, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.center();
    });

    this.handle(DesktopIPCChannels.WINDOW_SET_FULLSCREEN, (event, flag: boolean) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.setFullScreen(flag);
    });

    this.handle(DesktopIPCChannels.WINDOW_IS_MAXIMIZED, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      return window?.isMaximized() ?? false;
    });

    this.handle(DesktopIPCChannels.WINDOW_IS_MINIMIZED, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      return window?.isMinimized() ?? false;
    });

    this.handle(DesktopIPCChannels.WINDOW_IS_FULLSCREEN, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      return window?.isFullScreen() ?? false;
    });

    // 对话框
    this.handle(DesktopIPCChannels.DIALOG_OPEN_FILE, async (event, options) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        return dialog.showOpenDialog(window, options);
      }
      return dialog.showOpenDialog(options);
    });

    this.handle(DesktopIPCChannels.DIALOG_OPEN_DIRECTORY, async (event, options) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const dialogOptions = { ...options, properties: ['openDirectory'] };
      if (window) {
        return dialog.showOpenDialog(window, dialogOptions as Electron.OpenDialogOptions);
      }
      return dialog.showOpenDialog(dialogOptions as Electron.OpenDialogOptions);
    });

    this.handle(DesktopIPCChannels.DIALOG_SAVE_FILE, async (event, options) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        return dialog.showSaveDialog(window, options);
      }
      return dialog.showSaveDialog(options);
    });

    this.handle(DesktopIPCChannels.DIALOG_MESSAGE_BOX, async (event, options) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        return dialog.showMessageBox(window, options);
      }
      return dialog.showMessageBox(options);
    });

    // Shell 操作
    this.handle(DesktopIPCChannels.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
      return shell.openExternal(url);
    });

    this.handle(DesktopIPCChannels.SHELL_OPEN_PATH, async (_event, path: string) => {
      return shell.openPath(path);
    });

    this.handle(DesktopIPCChannels.SHELL_SHOW_ITEM_IN_FOLDER, (_event, path: string) => {
      shell.showItemInFolder(path);
    });

    this.handle(DesktopIPCChannels.SHELL_TRASH_ITEM, async (_event, path: string) => {
      return shell.trashItem(path);
    });

    this.handle(DesktopIPCChannels.SHELL_BEEP, () => {
      shell.beep();
    });

    // 剪贴板
    this.handle(DesktopIPCChannels.CLIPBOARD_READ_TEXT, () => {
      return clipboard.readText();
    });

    this.handle(DesktopIPCChannels.CLIPBOARD_WRITE_TEXT, (_event, text: string) => {
      clipboard.writeText(text);
    });

    this.handle(DesktopIPCChannels.CLIPBOARD_READ_HTML, () => {
      return clipboard.readHTML();
    });

    this.handle(DesktopIPCChannels.CLIPBOARD_WRITE_HTML, (_event, markup: string) => {
      clipboard.writeHTML(markup);
    });

    this.handle(DesktopIPCChannels.CLIPBOARD_CLEAR, () => {
      clipboard.clear();
    });

    // 系统信息
    this.handle(DesktopIPCChannels.SYSTEM_GET_INFO, () => {
      return {
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions['electron'],
        chromeVersion: process.versions['chrome'],
        nodeVersion: process.versions['node'],
      };
    });

    this.handle(DesktopIPCChannels.SYSTEM_GET_SCREEN_INFO, () => {
      const { screen } = this.electron!;
      const primary = screen.getPrimaryDisplay();
      return {
        width: primary.size.width,
        height: primary.size.height,
        scaleFactor: primary.scaleFactor,
        workArea: primary.workArea,
      };
    });

    // 主题
    this.handle(DesktopIPCChannels.THEME_GET_NATIVE, () => {
      return nativeTheme.themeSource;
    });

    this.handle(DesktopIPCChannels.THEME_SHOULD_USE_DARK, () => {
      return nativeTheme.shouldUseDarkColors;
    });
  }

  /**
   * 注册 IPC 处理器
   */
  handle(channel: string, handler: IpcHandler): void {
    if (!this.electron) {
      // 保存到内部映射，供测试使用
      this.handlers.set(channel, handler);
      return;
    }

    const { ipcMain } = this.electron;

    // 如果已有处理器，先移除
    if (this.handlers.has(channel)) {
      ipcMain.removeHandler(channel);
    }

    // 注册新处理器
    ipcMain.handle(channel, handler);
    this.handlers.set(channel, handler);
  }

  /**
   * 移除 IPC 处理器
   */
  removeHandler(channel: string): void {
    if (!this.electron) {
      this.handlers.delete(channel);
      return;
    }

    const { ipcMain } = this.electron;
    ipcMain.removeHandler(channel);
    this.handlers.delete(channel);
  }

  /**
   * 批量注册 IPC 处理器
   */
  registerHandlers(configs: IpcHandlerConfig[]): void {
    for (const config of configs) {
      this.handle(config.channel, config.handler);
    }
  }

  /**
   * 批量移除 IPC 处理器
   */
  removeHandlers(channels: string[]): void {
    for (const channel of channels) {
      this.removeHandler(channel);
    }
  }

  /**
   * 获取已注册的处理器列表
   */
  getRegisteredChannels(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 检查处理器是否已注册
   */
  hasHandler(channel: string): boolean {
    return this.handlers.has(channel);
  }

  /**
   * 销毁 IPC 桥接
   */
  destroy(): void {
    if (!this.electron) {
      this.handlers.clear();
      return;
    }

    const { ipcMain } = this.electron;

    // 移除所有处理器
    for (const channel of this.handlers.keys()) {
      ipcMain.removeHandler(channel);
    }
    this.handlers.clear();
  }
}

/**
 * 全局 IPC 桥接实例
 */
export const ipcBridge = new IPCBridge();
