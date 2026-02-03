/**
 * IPC Main 主进程通信封装
 * @module @chips/foundation/runtime/electron-framework/ipc-main
 *
 * 提供 Electron IPC 主进程通信的封装
 */

import type { IIPCMain, IpcMainEvent, IpcMainInvokeEvent, IpcHandler, IWebContents } from './types';

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
 * 检查是否在主进程
 */
function isMainProcess(): boolean {
  return isElectronAvailable() && typeof window === 'undefined';
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
// IPC 事件包装器
// ============================================================================

/**
 * 包装 IPC 事件
 */
function wrapIpcEvent(event: Electron.IpcMainEvent): IpcMainEvent {
  return {
    frameId: event.frameId,
    reply: (channel: string, ...args: unknown[]) => event.reply(channel, ...args),
    sender: wrapWebContents(event.sender),
  };
}

/**
 * 包装 IPC 调用事件
 */
function wrapIpcInvokeEvent(event: Electron.IpcMainInvokeEvent): IpcMainInvokeEvent {
  return {
    frameId: event.frameId,
    sender: wrapWebContents(event.sender),
  };
}

/**
 * 包装 WebContents
 */
function wrapWebContents(webContents: Electron.WebContents): IWebContents {
  return {
    id: webContents.id,
    send: (channel: string, ...args: unknown[]) => webContents.send(channel, ...args),
    executeJavaScript: (code: string) => webContents.executeJavaScript(code),
    insertCSS: (css: string) => webContents.insertCSS(css),
    removeInsertedCSS: (key: string) => webContents.removeInsertedCSS(key),
    openDevTools: () => webContents.openDevTools(),
    closeDevTools: () => webContents.closeDevTools(),
    isDevToolsOpened: () => webContents.isDevToolsOpened(),
    toggleDevTools: () => webContents.toggleDevTools(),
    getURL: () => webContents.getURL(),
    getTitle: () => webContents.getTitle(),
    isLoading: () => webContents.isLoading(),
    isWaitingForResponse: () => webContents.isWaitingForResponse(),
    stop: () => webContents.stop(),
    reload: () => webContents.reload(),
    canGoBack: () => webContents.canGoBack(),
    canGoForward: () => webContents.canGoForward(),
    goBack: () => webContents.goBack(),
    goForward: () => webContents.goForward(),
    setZoomLevel: (level: number) => webContents.setZoomLevel(level),
    getZoomLevel: () => webContents.getZoomLevel(),
    setZoomFactor: (factor: number) => webContents.setZoomFactor(factor),
    getZoomFactor: () => webContents.getZoomFactor(),
    print: (options?: Electron.WebContentsPrintOptions) => webContents.print(options),
    printToPDF: (options: Electron.PrintToPDFOptions) => webContents.printToPDF(options),
  };
}

// ============================================================================
// IPC Main 管理器
// ============================================================================

/**
 * IPC Main 管理器
 * 提供主进程 IPC 通信的管理
 */
export class IPCMainManager implements IIPCMain {
  private handlers: Map<string, Set<(event: IpcMainEvent, ...args: unknown[]) => void>> =
    new Map();
  private invokeHandlers: Map<
    string,
    (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>
  > = new Map();
  private isElectronMain: boolean;

  constructor() {
    this.isElectronMain = isMainProcess();
  }

  /**
   * 监听通道消息
   */
  on(channel: string, handler: (event: IpcMainEvent, ...args: unknown[]) => void): void {
    const electron = getElectron();
    if (!electron || !this.isElectronMain) {
      // 非 Electron 主进程环境，使用模拟实现
      this.addSimulatedHandler(channel, handler);
      return;
    }

    const wrappedHandler = (event: Electron.IpcMainEvent, ...args: unknown[]) => {
      handler(wrapIpcEvent(event), ...args);
    };

    electron.ipcMain.on(channel, wrappedHandler);

    // 保存处理器引用，用于移除
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);
  }

  /**
   * 单次监听通道消息
   */
  once(channel: string, handler: (event: IpcMainEvent, ...args: unknown[]) => void): void {
    const electron = getElectron();
    if (!electron || !this.isElectronMain) {
      // 非 Electron 主进程环境，使用模拟实现
      this.addSimulatedHandlerOnce(channel, handler);
      return;
    }

    const wrappedHandler = (event: Electron.IpcMainEvent, ...args: unknown[]) => {
      handler(wrapIpcEvent(event), ...args);
    };

    electron.ipcMain.once(channel, wrappedHandler);
  }

  /**
   * 处理异步调用
   */
  handle(
    channel: string,
    handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>
  ): void {
    const electron = getElectron();
    if (!electron || !this.isElectronMain) {
      // 非 Electron 主进程环境，保存到模拟处理器
      this.invokeHandlers.set(channel, handler);
      return;
    }

    // 如果已有处理器，先移除
    if (this.invokeHandlers.has(channel)) {
      electron.ipcMain.removeHandler(channel);
    }

    const wrappedHandler = (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
      return handler(wrapIpcInvokeEvent(event), ...args);
    };

    electron.ipcMain.handle(channel, wrappedHandler);
    this.invokeHandlers.set(channel, handler);
  }

  /**
   * 处理单次异步调用
   */
  handleOnce(
    channel: string,
    handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>
  ): void {
    const electron = getElectron();
    if (!electron || !this.isElectronMain) {
      // 非 Electron 主进程环境，保存到模拟处理器
      const onceHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => {
        this.invokeHandlers.delete(channel);
        return handler(event, ...args);
      };
      this.invokeHandlers.set(channel, onceHandler);
      return;
    }

    const wrappedHandler = (event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
      return handler(wrapIpcInvokeEvent(event), ...args);
    };

    electron.ipcMain.handleOnce(channel, wrappedHandler);
  }

  /**
   * 移除处理器
   */
  removeHandler(channel: string): void {
    const electron = getElectron();
    if (electron && this.isElectronMain) {
      electron.ipcMain.removeHandler(channel);
    }
    this.invokeHandlers.delete(channel);
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(channel?: string): void {
    const electron = getElectron();
    if (electron && this.isElectronMain) {
      if (channel) {
        electron.ipcMain.removeAllListeners(channel);
        this.handlers.delete(channel);
      } else {
        // 移除所有通道的监听器
        for (const ch of this.handlers.keys()) {
          electron.ipcMain.removeAllListeners(ch);
        }
        this.handlers.clear();
      }
    } else {
      if (channel) {
        this.handlers.delete(channel);
      } else {
        this.handlers.clear();
      }
    }
  }

  // ========== 模拟实现（用于非 Electron 环境或测试） ==========

  private simulatedHandlers: Map<string, Set<(event: IpcMainEvent, ...args: unknown[]) => void>> =
    new Map();

  /**
   * 添加模拟处理器
   */
  private addSimulatedHandler(
    channel: string,
    handler: (event: IpcMainEvent, ...args: unknown[]) => void
  ): void {
    if (!this.simulatedHandlers.has(channel)) {
      this.simulatedHandlers.set(channel, new Set());
    }
    this.simulatedHandlers.get(channel)!.add(handler);
  }

  /**
   * 添加单次模拟处理器
   */
  private addSimulatedHandlerOnce(
    channel: string,
    handler: (event: IpcMainEvent, ...args: unknown[]) => void
  ): void {
    const onceHandler = (event: IpcMainEvent, ...args: unknown[]) => {
      this.simulatedHandlers.get(channel)?.delete(onceHandler);
      handler(event, ...args);
    };
    this.addSimulatedHandler(channel, onceHandler);
  }

  /**
   * 模拟发送消息（用于测试）
   */
  simulateSend(channel: string, ...args: unknown[]): void {
    const handlers = this.simulatedHandlers.get(channel);
    if (handlers) {
      const mockEvent: IpcMainEvent = {
        frameId: 0,
        reply: () => {},
        sender: this.createMockWebContents(),
      };
      for (const handler of handlers) {
        handler(mockEvent, ...args);
      }
    }
  }

  /**
   * 模拟调用（用于测试）
   */
  async simulateInvoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = this.invokeHandlers.get(channel);
    if (!handler) {
      throw new Error(`No handler for channel: ${channel}`);
    }

    const mockEvent: IpcMainInvokeEvent = {
      frameId: 0,
      sender: this.createMockWebContents(),
    };

    return handler(mockEvent, ...args);
  }

  /**
   * 创建模拟 WebContents
   */
  private createMockWebContents(): IWebContents {
    return {
      id: -1,
      send: () => {},
      executeJavaScript: async () => undefined,
      insertCSS: async () => '',
      removeInsertedCSS: async () => {},
      openDevTools: () => {},
      closeDevTools: () => {},
      isDevToolsOpened: () => false,
      toggleDevTools: () => {},
      getURL: () => '',
      getTitle: () => '',
      isLoading: () => false,
      isWaitingForResponse: () => false,
      stop: () => {},
      reload: () => {},
      canGoBack: () => false,
      canGoForward: () => false,
      goBack: () => {},
      goForward: () => {},
      setZoomLevel: () => {},
      getZoomLevel: () => 0,
      setZoomFactor: () => {},
      getZoomFactor: () => 1,
      print: () => {},
      printToPDF: async () => Buffer.alloc(0),
    };
  }
}

/**
 * 全局 IPC Main 管理器实例
 */
export const ipcMainManager = new IPCMainManager();

// ============================================================================
// IPC 通道注册辅助
// ============================================================================

/**
 * IPC 处理器配置
 */
export interface IPCHandlerConfig {
  /** 通道名称 */
  channel: string;
  /** 处理器函数 */
  handler: IpcHandler;
  /** 是否为异步调用（handle） */
  invoke?: boolean;
  /** 是否只处理一次 */
  once?: boolean;
}

/**
 * 批量注册 IPC 处理器
 */
export function registerIPCHandlers(configs: IPCHandlerConfig[]): void {
  for (const config of configs) {
    if (config.invoke) {
      if (config.once) {
        ipcMainManager.handleOnce(config.channel, config.handler);
      } else {
        ipcMainManager.handle(config.channel, config.handler);
      }
    } else {
      if (config.once) {
        ipcMainManager.once(config.channel, config.handler as (event: IpcMainEvent, ...args: unknown[]) => void);
      } else {
        ipcMainManager.on(config.channel, config.handler as (event: IpcMainEvent, ...args: unknown[]) => void);
      }
    }
  }
}

/**
 * 批量移除 IPC 处理器
 */
export function unregisterIPCHandlers(channels: string[]): void {
  for (const channel of channels) {
    ipcMainManager.removeHandler(channel);
    ipcMainManager.removeAllListeners(channel);
  }
}

// ============================================================================
// 预定义 IPC 通道
// ============================================================================

/**
 * 预定义的 IPC 通道常量
 */
export const IPCChannels = {
  // 应用生命周期
  APP_QUIT: 'app:quit',
  APP_RELAUNCH: 'app:relaunch',
  APP_GET_INFO: 'app:getInfo',
  APP_GET_PATH: 'app:getPath',

  // 窗口操作
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_RESTORE: 'window:restore',
  WINDOW_SET_TITLE: 'window:setTitle',
  WINDOW_SET_SIZE: 'window:setSize',
  WINDOW_SET_POSITION: 'window:setPosition',
  WINDOW_CENTER: 'window:center',
  WINDOW_SET_FULLSCREEN: 'window:setFullscreen',

  // 对话框
  DIALOG_OPEN_FILE: 'dialog:openFile',
  DIALOG_OPEN_DIRECTORY: 'dialog:openDirectory',
  DIALOG_SAVE_FILE: 'dialog:saveFile',
  DIALOG_MESSAGE_BOX: 'dialog:messageBox',

  // Shell 操作
  SHELL_OPEN_EXTERNAL: 'shell:openExternal',
  SHELL_OPEN_PATH: 'shell:openPath',
  SHELL_SHOW_ITEM_IN_FOLDER: 'shell:showItemInFolder',
  SHELL_TRASH_ITEM: 'shell:trashItem',

  // 剪贴板
  CLIPBOARD_READ_TEXT: 'clipboard:readText',
  CLIPBOARD_WRITE_TEXT: 'clipboard:writeText',
  CLIPBOARD_READ_HTML: 'clipboard:readHTML',
  CLIPBOARD_WRITE_HTML: 'clipboard:writeHTML',
  CLIPBOARD_CLEAR: 'clipboard:clear',

  // 系统信息
  SYSTEM_GET_INFO: 'system:getInfo',
  SYSTEM_GET_SCREEN_INFO: 'system:getScreenInfo',

  // 通知
  NOTIFICATION_SHOW: 'notification:show',
} as const;

export type IPCChannel = (typeof IPCChannels)[keyof typeof IPCChannels];
