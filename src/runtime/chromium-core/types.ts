/**
 * ChromiumCore 类型定义
 * @module @chips/foundation/runtime/chromium-core/types
 *
 * 提供 Chromium 相关的完整类型定义
 */

// ============================================================================
// WebView 相关类型
// ============================================================================

/**
 * WebView 配置
 */
export interface WebViewConfig {
  /** 预加载脚本路径 */
  preload?: string;
  /** 会话分区 */
  partition?: string;
  /** 是否启用 Web 安全 */
  webSecurity?: boolean;
  /** 是否允许运行不安全内容 */
  allowRunningInsecureContent?: boolean;
  /** 是否启用 Node.js 集成 */
  nodeIntegration?: boolean;
  /** 是否启用上下文隔离 */
  contextIsolation?: boolean;
  /** 是否启用沙箱 */
  sandbox?: boolean;
  /** 初始 URL */
  src?: string;
  /** 用户代理 */
  useragent?: string;
  /** 是否禁用 WebGL */
  disablewebgl?: boolean;
  /** 是否禁用弹出窗口 */
  disablepopups?: boolean;
  /** 是否启用远程模块 */
  enableremotemodule?: boolean;
  /** HTTP referrer */
  httpreferrer?: string;
  /** 混合内容配置 */
  blinkfeatures?: string;
  /** 禁用的 Blink 特性 */
  disableblinkfeatures?: string;
}

/**
 * WebView 加载事件
 */
export interface WebViewLoadEvent {
  /** URL */
  url: string;
  /** 是否为顶级框架 */
  isMainFrame: boolean;
  /** 框架 ID */
  frameId?: number;
}

/**
 * WebView 加载失败事件
 */
export interface WebViewLoadFailEvent extends WebViewLoadEvent {
  /** 错误代码 */
  errorCode: number;
  /** 错误描述 */
  errorDescription: string;
  /** 验证状态 */
  validatedURL?: string;
}

/**
 * WebView 控制台消息事件
 */
export interface WebViewConsoleMessageEvent {
  /** 消息级别 */
  level: number;
  /** 消息内容 */
  message: string;
  /** 行号 */
  line: number;
  /** 来源 ID */
  sourceId: string;
}

/**
 * WebView 新窗口事件
 */
export interface WebViewNewWindowEvent {
  /** URL */
  url: string;
  /** 框架名称 */
  frameName: string;
  /** 打开方式 */
  disposition:
    | 'default'
    | 'foreground-tab'
    | 'background-tab'
    | 'new-window'
    | 'save-to-disk'
    | 'other';
  /** 窗口特性 */
  options?: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
  };
}

/**
 * WebView 权限请求事件
 */
export interface WebViewPermissionRequestEvent {
  /** 权限类型 */
  permission:
    | 'media'
    | 'geolocation'
    | 'notifications'
    | 'midiSysex'
    | 'pointerLock'
    | 'fullscreen'
    | 'openExternal'
    | 'unknown';
  /** 回调函数 */
  callback: (granted: boolean) => void;
}

/**
 * WebView 事件类型
 */
export type WebViewEventType =
  | 'load-commit'
  | 'did-start-loading'
  | 'did-stop-loading'
  | 'did-finish-load'
  | 'did-fail-load'
  | 'did-frame-finish-load'
  | 'dom-ready'
  | 'page-title-updated'
  | 'page-favicon-updated'
  | 'enter-html-full-screen'
  | 'leave-html-full-screen'
  | 'console-message'
  | 'found-in-page'
  | 'new-window'
  | 'will-navigate'
  | 'did-navigate'
  | 'did-navigate-in-page'
  | 'close'
  | 'ipc-message'
  | 'crashed'
  | 'plugin-crashed'
  | 'destroyed'
  | 'media-started-playing'
  | 'media-paused'
  | 'did-change-theme-color'
  | 'update-target-url'
  | 'devtools-opened'
  | 'devtools-closed'
  | 'devtools-focused'
  | 'context-menu';

// ============================================================================
// WebView 接口
// ============================================================================

/**
 * WebView 接口
 */
export interface IWebView {
  /** WebView ID */
  readonly id: string;
  /** DOM 元素 */
  readonly element: HTMLElement;

  // ========== 导航 ==========
  /**
   * 加载 URL
   */
  loadURL(url: string): Promise<void>;
  /**
   * 加载 HTML 内容
   */
  loadHTML(html: string, baseURL?: string): Promise<void>;
  /**
   * 重新加载
   */
  reload(): void;
  /**
   * 停止加载
   */
  stop(): void;
  /**
   * 后退
   */
  goBack(): void;
  /**
   * 前进
   */
  goForward(): void;
  /**
   * 前往历史记录中的指定位置
   */
  goToOffset(offset: number): void;

  // ========== 状态 ==========
  /**
   * 获取当前 URL
   */
  getURL(): string;
  /**
   * 获取标题
   */
  getTitle(): string;
  /**
   * 是否正在加载
   */
  isLoading(): boolean;
  /**
   * 是否等待响应
   */
  isWaitingForResponse(): boolean;
  /**
   * 是否可以后退
   */
  canGoBack(): boolean;
  /**
   * 是否可以前进
   */
  canGoForward(): boolean;
  /**
   * 是否已崩溃
   */
  isCrashed(): boolean;

  // ========== 内容操作 ==========
  /**
   * 执行 JavaScript
   */
  executeJavaScript(code: string): Promise<unknown>;
  /**
   * 注入 CSS
   */
  insertCSS(css: string): Promise<string>;
  /**
   * 移除注入的 CSS
   */
  removeInsertedCSS(key: string): Promise<void>;

  // ========== 缩放 ==========
  /**
   * 设置缩放因子
   */
  setZoomFactor(factor: number): void;
  /**
   * 获取缩放因子
   */
  getZoomFactor(): number;
  /**
   * 设置缩放级别
   */
  setZoomLevel(level: number): void;
  /**
   * 获取缩放级别
   */
  getZoomLevel(): number;

  // ========== 查找 ==========
  /**
   * 在页面中查找
   */
  findInPage(text: string, options?: FindInPageOptions): number;
  /**
   * 停止查找
   */
  stopFindInPage(action: 'clearSelection' | 'keepSelection' | 'activateSelection'): void;

  // ========== 开发者工具 ==========
  /**
   * 打开开发者工具
   */
  openDevTools(): void;
  /**
   * 关闭开发者工具
   */
  closeDevTools(): void;
  /**
   * 开发者工具是否打开
   */
  isDevToolsOpened(): boolean;
  /**
   * 切换开发者工具
   */
  toggleDevTools(): void;

  // ========== 其他 ==========
  /**
   * 设置用户代理
   */
  setUserAgent(userAgent: string): void;
  /**
   * 获取用户代理
   */
  getUserAgent(): string;
  /**
   * 设置音频静音
   */
  setAudioMuted(muted: boolean): void;
  /**
   * 是否音频静音
   */
  isAudioMuted(): boolean;
  /**
   * 打印页面
   */
  print(): void;
  /**
   * 打印为 PDF
   */
  printToPDF(options?: PrintToPDFOptions): Promise<Uint8Array>;

  // ========== 事件 ==========
  /**
   * 监听加载开始事件
   */
  onDidStartLoading(handler: () => void): () => void;
  /**
   * 监听加载停止事件
   */
  onDidStopLoading(handler: () => void): () => void;
  /**
   * 监听加载失败事件
   */
  onDidFailLoad(handler: (error: Error) => void): () => void;
  /**
   * 监听标题更新事件
   */
  onPageTitleUpdated(handler: (title: string) => void): () => void;
  /**
   * 监听 URL 变化事件
   */
  onDidNavigate(handler: (url: string) => void): () => void;
  /**
   * 监听 DOM 就绪事件
   */
  onDOMReady(handler: () => void): () => void;
  /**
   * 监听控制台消息事件
   */
  onConsoleMessage(handler: (event: WebViewConsoleMessageEvent) => void): () => void;
  /**
   * 监听新窗口事件
   */
  onNewWindow(handler: (event: WebViewNewWindowEvent) => void): () => void;

  // ========== 生命周期 ==========
  /**
   * 销毁 WebView
   */
  destroy(): void;
  /**
   * 是否已销毁
   */
  isDestroyed(): boolean;
}

/**
 * 查找选项
 */
export interface FindInPageOptions {
  /** 是否向前搜索 */
  forward?: boolean;
  /** 是否区分大小写 */
  matchCase?: boolean;
  /** 是否从头开始 */
  findNext?: boolean;
}

/**
 * 打印为 PDF 选项
 */
export interface PrintToPDFOptions {
  /** 页眉模板 */
  headerTemplate?: string;
  /** 页脚模板 */
  footerTemplate?: string;
  /** 是否打印背景 */
  printBackground?: boolean;
  /** 是否横向 */
  landscape?: boolean;
  /** 页面大小 */
  pageSize?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid' | { width: number; height: number };
  /** 边距 */
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** 缩放 */
  scale?: number;
}

// ============================================================================
// ChromiumCore 接口
// ============================================================================

/**
 * ChromiumCore 接口
 */
export interface IChromiumCore {
  // ========== WebView 管理 ==========
  /**
   * 创建 WebView
   */
  createWebView(config: WebViewConfig): IWebView;
  /**
   * 获取 WebView
   */
  getWebView(viewId: string): IWebView | null;
  /**
   * 销毁 WebView
   */
  destroyWebView(viewId: string): void;
  /**
   * 获取所有 WebView
   */
  getAllWebViews(): IWebView[];

  // ========== 渲染进程通信 ==========
  /**
   * 发送消息到渲染进程
   */
  sendToRenderer(viewId: string, channel: string, data: unknown): void;
  /**
   * 监听渲染进程消息
   */
  onRendererMessage(
    channel: string,
    handler: (viewId: string, data: unknown) => void
  ): () => void;

  // ========== DevTools ==========
  /**
   * 打开开发者工具
   */
  openDevTools(viewId: string): void;
  /**
   * 关闭开发者工具
   */
  closeDevTools(viewId: string): void;

  // ========== 版本信息 ==========
  /**
   * 获取 Chromium 版本
   */
  getChromiumVersion(): string;
  /**
   * 获取 V8 版本
   */
  getV8Version(): string;
  /**
   * 获取 Node.js 版本
   */
  getNodeVersion(): string;
  /**
   * 获取 Electron 版本
   */
  getElectronVersion(): string;

  // ========== 环境检测 ==========
  /**
   * 是否在 Electron 环境
   */
  isElectron(): boolean;
  /**
   * 是否在渲染进程
   */
  isRenderer(): boolean;
  /**
   * 是否在主进程
   */
  isMain(): boolean;

  // ========== 平台信息 ==========
  /**
   * 获取平台
   */
  getPlatform(): string;
  /**
   * 获取用户代理
   */
  getUserAgent(): string;
}

// ============================================================================
// IPC 相关类型
// ============================================================================

/**
 * IPC 消息
 */
export interface IPCMessage {
  /** 通道 */
  channel: string;
  /** 数据 */
  data: unknown;
  /** 消息 ID */
  messageId?: string;
  /** 发送者 WebView ID */
  senderId?: string;
}

/**
 * IPC 处理器
 */
export type IPCHandler = (message: IPCMessage) => unknown | Promise<unknown>;
