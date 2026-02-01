/**
 * ChromiumCore Chromium核心
 * @module @chips/foundation/runtime/chromium-core/chromium-core
 *
 * 提供 WebView 封装和进程间通信
 */

/**
 * WebView 配置
 */
export interface WebViewConfig {
  /** 预加载脚本 */
  preload?: string;
  /** 是否启用 Node.js 集成 */
  nodeIntegration?: boolean;
  /** 是否启用上下文隔离 */
  contextIsolation?: boolean;
  /** 是否启用 WebSecurity */
  webSecurity?: boolean;
}

/**
 * IPC 消息
 */
export interface IPCMessage {
  /** 通道 */
  channel: string;
  /** 数据 */
  data: unknown;
  /** 消息ID */
  messageId?: string;
}

/**
 * ChromiumCore Chromium核心
 */
export class ChromiumCore {
  private ipcHandlers: Map<string, ((data: unknown) => unknown)[]> = new Map();
  private defaultConfig: WebViewConfig;

  constructor(config?: WebViewConfig) {
    this.defaultConfig = {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      ...config,
    };
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): WebViewConfig {
    return { ...this.defaultConfig };
  }

  /**
   * 注册 IPC 处理器
   */
  onIPC(channel: string, handler: (data: unknown) => unknown): () => void {
    const handlers = this.ipcHandlers.get(channel) ?? [];
    handlers.push(handler);
    this.ipcHandlers.set(channel, handlers);

    return () => {
      const handlers = this.ipcHandlers.get(channel) ?? [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * 发送 IPC 消息
   */
  sendIPC(channel: string, data: unknown): void {
    const handlers = this.ipcHandlers.get(channel) ?? [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`IPC handler error on channel ${channel}:`, error);
      }
    }
  }

  /**
   * 调用 IPC 并等待响应
   */
  async invokeIPC<T>(channel: string, data: unknown): Promise<T> {
    const handlers = this.ipcHandlers.get(channel) ?? [];
    if (handlers.length === 0) {
      throw new Error(`No handler for channel: ${channel}`);
    }

    const handler = handlers[0];
    if (!handler) {
      throw new Error(`No handler for channel: ${channel}`);
    }

    const result = handler(data);
    if (result instanceof Promise) {
      return (await result) as T;
    }
    return result as T;
  }

  /**
   * 检查是否在 Electron 环境
   */
  isElectron(): boolean {
    return typeof process !== 'undefined' && 'electron' in (process.versions ?? {});
  }

  /**
   * 检查是否在渲染进程
   */
  isRenderer(): boolean {
    return this.isElectron() && typeof window !== 'undefined';
  }

  /**
   * 检查是否在主进程
   */
  isMain(): boolean {
    return this.isElectron() && typeof window === 'undefined';
  }

  /**
   * 获取平台信息
   */
  getPlatform(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.platform;
    }
    if (typeof process !== 'undefined') {
      return process.platform;
    }
    return 'unknown';
  }

  /**
   * 获取用户代理
   */
  getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return 'Chips Foundation';
  }
}

/**
 * 全局 Chromium 核心实例
 */
export const chromiumCore = new ChromiumCore();
