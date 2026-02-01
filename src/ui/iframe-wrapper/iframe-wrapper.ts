/**
 * IFrameWrapper iframe封装器
 * @module @chips/foundation/ui/iframe-wrapper/iframe-wrapper
 *
 * 提供安全的 iframe 创建和通信封装
 */

import { generateId } from '../../core/utils/id-generator';

/**
 * IFrame 配置
 */
export interface IFrameConfig {
  /** 容器元素 */
  container: HTMLElement;
  /** 宽度 */
  width?: string | number;
  /** 高度 */
  height?: string | number;
  /** 沙箱配置 */
  sandbox?: string[];
  /** CSS样式 */
  style?: Partial<CSSStyleDeclaration>;
}

/**
 * IFrame 消息
 */
export interface IFrameMessage {
  /** 消息类型 */
  type: string;
  /** 负载 */
  payload: unknown;
  /** 消息ID */
  messageId?: string;
}

/**
 * IFrameWrapper iframe封装器
 */
export class IFrameWrapper {
  private iframe: HTMLIFrameElement;
  private readonly frameId: string;
  private messageHandlers: Map<string, ((payload: unknown) => void)[]> = new Map();
  private pendingResponses: Map<string, (response: unknown) => void> = new Map();

  constructor(config: IFrameConfig) {
    this.frameId = generateId();
    this.iframe = this.createIFrame(config);

    // 监听消息
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  /**
   * 创建 iframe
   */
  private createIFrame(config: IFrameConfig): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = `iframe-${this.frameId}`;

    // 设置尺寸
    if (config.width !== undefined) {
      iframe.style.width = typeof config.width === 'number'
        ? `${config.width}px`
        : config.width;
    } else {
      iframe.style.width = '100%';
    }

    if (config.height !== undefined) {
      iframe.style.height = typeof config.height === 'number'
        ? `${config.height}px`
        : config.height;
    } else {
      iframe.style.height = '100%';
    }

    // 设置沙箱
    if (config.sandbox) {
      iframe.sandbox.add(...config.sandbox);
    } else {
      // 默认沙箱配置
      iframe.sandbox.add(
        'allow-scripts',
        'allow-same-origin'
      );
    }

    // 设置样式
    iframe.style.border = 'none';
    if (config.style) {
      Object.assign(iframe.style, config.style);
    }

    // 添加到容器
    config.container.appendChild(iframe);

    return iframe;
  }

  /**
   * 加载 HTML 内容
   */
  loadHTML(html: string): void {
    const doc = this.iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }

  /**
   * 加载 URL
   */
  loadURL(url: string): void {
    this.iframe.src = url;
  }

  /**
   * 发送消息
   */
  postMessage(type: string, payload: unknown): void {
    const message: IFrameMessage = {
      type,
      payload,
      messageId: generateId(),
    };

    this.iframe.contentWindow?.postMessage(message, '*');
  }

  /**
   * 发送消息并等待响应
   */
  async sendAndWait<T>(type: string, payload: unknown, timeout = 5000): Promise<T> {
    const messageId = generateId();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        reject(new Error('Message timeout'));
      }, timeout);

      this.pendingResponses.set(messageId, (response) => {
        clearTimeout(timer);
        this.pendingResponses.delete(messageId);
        resolve(response as T);
      });

      const message: IFrameMessage = {
        type,
        payload,
        messageId,
      };

      this.iframe.contentWindow?.postMessage(message, '*');
    });
  }

  /**
   * 监听消息
   */
  on(type: string, handler: (payload: unknown) => void): () => void {
    const handlers = this.messageHandlers.get(type) ?? [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);

    return () => {
      const handlers = this.messageHandlers.get(type) ?? [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * 处理消息
   */
  private handleMessage(event: MessageEvent): void {
    // 验证来源
    if (event.source !== this.iframe.contentWindow) {
      return;
    }

    const message = event.data as IFrameMessage;
    if (!message?.type) {
      return;
    }

    // 检查是否是响应
    if (message.messageId && this.pendingResponses.has(message.messageId)) {
      const resolver = this.pendingResponses.get(message.messageId);
      resolver?.(message.payload);
      return;
    }

    // 分发到处理器
    const handlers = this.messageHandlers.get(message.type) ?? [];
    for (const handler of handlers) {
      try {
        handler(message.payload);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('IFrame message handler error:', error);
      }
    }
  }

  /**
   * 获取 iframe 元素
   */
  getElement(): HTMLIFrameElement {
    return this.iframe;
  }

  /**
   * 获取 iframe ID
   */
  getId(): string {
    return this.frameId;
  }

  /**
   * 销毁
   */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage.bind(this));
    this.iframe.remove();
  }
}
