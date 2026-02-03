/**
 * ChromiumCore Chromium核心
 * @module @chips/foundation/runtime/chromium-core/chromium-core
 *
 * 提供 WebView 封装和进程间通信
 */

import type {
  WebViewConfig,
  IWebView,
  IChromiumCore,
  FindInPageOptions,
  PrintToPDFOptions,
  WebViewConsoleMessageEvent,
  WebViewNewWindowEvent,
  IPCMessage,
  IPCHandler,
} from './types';

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `webview-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 检查 Electron 是否可用
 */
function isElectronAvailable(): boolean {
  return typeof process !== 'undefined' && 'electron' in (process.versions ?? {});
}

/**
 * 检查是否在渲染进程
 */
function isRendererProcess(): boolean {
  return isElectronAvailable() && typeof window !== 'undefined';
}

// ============================================================================
// WebView 实现
// ============================================================================

/**
 * WebView 封装类
 * 在浏览器环境使用 iframe，在 Electron 环境使用 webview 标签
 */
export class WebViewWrapper implements IWebView {
  readonly id: string;
  readonly element: HTMLElement;

  private _config: WebViewConfig;
  private _url: string = '';
  private _title: string = '';
  private _loading: boolean = false;
  private _destroyed: boolean = false;
  private _zoomFactor: number = 1;
  private _zoomLevel: number = 0;
  private _audioMuted: boolean = false;
  private _userAgent: string = '';
  private _isElectronWebView: boolean;
  private _eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  constructor(id: string, config: WebViewConfig) {
    this.id = id;
    this._config = config;
    this._isElectronWebView = isRendererProcess();

    if (this._isElectronWebView) {
      // Electron 环境使用 webview 标签
      this.element = this.createElectronWebView(config);
    } else {
      // 浏览器环境使用 iframe
      this.element = this.createBrowserIframe(config);
    }
  }

  /**
   * 创建 Electron WebView
   */
  private createElectronWebView(config: WebViewConfig): HTMLElement {
    const webview = document.createElement('webview') as HTMLElement & {
      src?: string;
      preload?: string;
      partition?: string;
      webpreferences?: string;
      useragent?: string;
      loadURL: (url: string) => Promise<void>;
      getURL: () => string;
      getTitle: () => string;
      isLoading: () => boolean;
      isWaitingForResponse: () => boolean;
      stop: () => void;
      reload: () => void;
      canGoBack: () => boolean;
      canGoForward: () => boolean;
      goBack: () => void;
      goForward: () => void;
      goToOffset: (offset: number) => void;
      isCrashed: () => boolean;
      executeJavaScript: (code: string) => Promise<unknown>;
      insertCSS: (css: string) => Promise<string>;
      removeInsertedCSS: (key: string) => Promise<void>;
      setZoomFactor: (factor: number) => void;
      getZoomFactor: () => number;
      setZoomLevel: (level: number) => void;
      getZoomLevel: () => number;
      findInPage: (text: string, options?: Electron.FindInPageOptions) => number;
      stopFindInPage: (action: 'clearSelection' | 'keepSelection' | 'activateSelection') => void;
      openDevTools: () => void;
      closeDevTools: () => void;
      isDevToolsOpened: () => boolean;
      setUserAgent: (userAgent: string) => void;
      getUserAgent: () => string;
      setAudioMuted: (muted: boolean) => void;
      isAudioMuted: () => boolean;
      print: () => void;
      printToPDF: (options?: Electron.PrintToPDFOptions) => Promise<Buffer>;
      send: (channel: string, ...args: unknown[]) => void;
    };

    // 设置属性
    webview.id = this.id;
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.border = 'none';

    // WebPreferences
    const webPrefs: string[] = [];
    if (config.nodeIntegration) webPrefs.push('nodeIntegration=yes');
    else webPrefs.push('nodeIntegration=no');
    if (config.contextIsolation !== false) webPrefs.push('contextIsolation=yes');
    else webPrefs.push('contextIsolation=no');
    if (config.sandbox) webPrefs.push('sandbox=yes');
    if (!config.webSecurity) webPrefs.push('webSecurity=no');
    if (config.allowRunningInsecureContent) webPrefs.push('allowRunningInsecureContent=yes');

    if (webPrefs.length > 0) {
      webview.setAttribute('webpreferences', webPrefs.join(', '));
    }

    if (config.preload) {
      webview.setAttribute('preload', config.preload);
    }
    if (config.partition) {
      webview.setAttribute('partition', config.partition);
    }
    if (config.useragent) {
      webview.setAttribute('useragent', config.useragent);
      this._userAgent = config.useragent;
    }
    if (config.src) {
      webview.setAttribute('src', config.src);
      this._url = config.src;
    }

    // 绑定事件
    this.bindElectronWebViewEvents(webview);

    return webview;
  }

  /**
   * 绑定 Electron WebView 事件
   */
  private bindElectronWebViewEvents(webview: HTMLElement): void {
    webview.addEventListener('did-start-loading', () => {
      this._loading = true;
      this.emit('did-start-loading');
    });

    webview.addEventListener('did-stop-loading', () => {
      this._loading = false;
      this.emit('did-stop-loading');
    });

    webview.addEventListener('did-finish-load', () => {
      this._loading = false;
      this.emit('did-finish-load');
    });

    webview.addEventListener('did-fail-load', (event: Event) => {
      this._loading = false;
      const customEvent = event as CustomEvent;
      this.emit('did-fail-load', new Error(customEvent.detail?.errorDescription ?? 'Load failed'));
    });

    webview.addEventListener('page-title-updated', (event: Event) => {
      const customEvent = event as CustomEvent;
      this._title = customEvent.detail?.title ?? '';
      this.emit('page-title-updated', this._title);
    });

    webview.addEventListener('did-navigate', (event: Event) => {
      const customEvent = event as CustomEvent;
      this._url = customEvent.detail?.url ?? '';
      this.emit('did-navigate', this._url);
    });

    webview.addEventListener('dom-ready', () => {
      this.emit('dom-ready');
    });

    webview.addEventListener('console-message', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.emit('console-message', {
        level: customEvent.detail?.level ?? 0,
        message: customEvent.detail?.message ?? '',
        line: customEvent.detail?.line ?? 0,
        sourceId: customEvent.detail?.sourceId ?? '',
      } as WebViewConsoleMessageEvent);
    });

    webview.addEventListener('new-window', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.emit('new-window', {
        url: customEvent.detail?.url ?? '',
        frameName: customEvent.detail?.frameName ?? '',
        disposition: customEvent.detail?.disposition ?? 'default',
        options: customEvent.detail?.options,
      } as WebViewNewWindowEvent);
    });
  }

  /**
   * 创建浏览器 iframe
   */
  private createBrowserIframe(config: WebViewConfig): HTMLElement {
    const iframe = document.createElement('iframe');
    iframe.id = this.id;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    // 沙箱设置
    const sandboxAttrs = ['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups'];
    if (config.allowRunningInsecureContent) {
      sandboxAttrs.push('allow-modals');
    }
    iframe.setAttribute('sandbox', sandboxAttrs.join(' '));

    // 设置初始 URL
    if (config.src) {
      iframe.src = config.src;
      this._url = config.src;
    }

    // 绑定事件
    iframe.addEventListener('load', () => {
      this._loading = false;
      try {
        this._title = iframe.contentDocument?.title ?? '';
        this._url = iframe.contentWindow?.location.href ?? this._url;
      } catch {
        // 跨域访问限制
      }
      this.emit('did-stop-loading');
      this.emit('did-finish-load');
    });

    iframe.addEventListener('error', (event) => {
      this._loading = false;
      this.emit('did-fail-load', new Error(event.message ?? 'Load failed'));
    });

    return iframe;
  }

  // ========== 事件系统 ==========

  private emit(event: string, ...args: unknown[]): void {
    const handlers = this._eventListeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error in WebView event handler for ${event}:`, error);
        }
      }
    }
  }

  private on(event: string, handler: (...args: unknown[]) => void): () => void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event)!.add(handler);

    return () => {
      this._eventListeners.get(event)?.delete(handler);
    };
  }

  // ========== 导航 ==========

  async loadURL(url: string): Promise<void> {
    this._loading = true;
    this._url = url;
    this.emit('did-start-loading');

    if (this._isElectronWebView) {
      const webview = this.element as unknown as { loadURL: (url: string) => Promise<void> };
      await webview.loadURL(url);
    } else {
      const iframe = this.element as HTMLIFrameElement;
      iframe.src = url;
    }
  }

  async loadHTML(html: string, baseURL?: string): Promise<void> {
    this._loading = true;
    this.emit('did-start-loading');

    if (this._isElectronWebView) {
      // Electron WebView：使用 data URL
      const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      const webview = this.element as unknown as { loadURL: (url: string) => Promise<void> };
      await webview.loadURL(dataURL);
    } else {
      // 浏览器 iframe：使用 srcdoc
      const iframe = this.element as HTMLIFrameElement;
      iframe.srcdoc = html;
    }
  }

  reload(): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { reload: () => void };
      webview.reload();
    } else {
      const iframe = this.element as HTMLIFrameElement;
      try {
        iframe.contentWindow?.location.reload();
      } catch {
        iframe.src = iframe.src;
      }
    }
  }

  stop(): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { stop: () => void };
      webview.stop();
    } else {
      const iframe = this.element as HTMLIFrameElement;
      try {
        iframe.contentWindow?.stop();
      } catch {
        // 跨域限制
      }
    }
  }

  goBack(): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { goBack: () => void };
      webview.goBack();
    } else {
      const iframe = this.element as HTMLIFrameElement;
      try {
        iframe.contentWindow?.history.back();
      } catch {
        // 跨域限制
      }
    }
  }

  goForward(): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { goForward: () => void };
      webview.goForward();
    } else {
      const iframe = this.element as HTMLIFrameElement;
      try {
        iframe.contentWindow?.history.forward();
      } catch {
        // 跨域限制
      }
    }
  }

  goToOffset(offset: number): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { goToOffset: (offset: number) => void };
      webview.goToOffset(offset);
    } else {
      const iframe = this.element as HTMLIFrameElement;
      try {
        iframe.contentWindow?.history.go(offset);
      } catch {
        // 跨域限制
      }
    }
  }

  // ========== 状态 ==========

  getURL(): string {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { getURL: () => string };
      return webview.getURL();
    }
    return this._url;
  }

  getTitle(): string {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { getTitle: () => string };
      return webview.getTitle();
    }
    return this._title;
  }

  isLoading(): boolean {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { isLoading: () => boolean };
      return webview.isLoading();
    }
    return this._loading;
  }

  isWaitingForResponse(): boolean {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { isWaitingForResponse: () => boolean };
      return webview.isWaitingForResponse();
    }
    return this._loading;
  }

  canGoBack(): boolean {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { canGoBack: () => boolean };
      return webview.canGoBack();
    }
    return false; // 浏览器 iframe 无法可靠检测
  }

  canGoForward(): boolean {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { canGoForward: () => boolean };
      return webview.canGoForward();
    }
    return false;
  }

  isCrashed(): boolean {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { isCrashed: () => boolean };
      return webview.isCrashed();
    }
    return false;
  }

  // ========== 内容操作 ==========

  async executeJavaScript(code: string): Promise<unknown> {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { executeJavaScript: (code: string) => Promise<unknown> };
      return webview.executeJavaScript(code);
    }

    // 浏览器 iframe
    const iframe = this.element as HTMLIFrameElement;
    try {
      return iframe.contentWindow?.eval(code);
    } catch {
      throw new Error('Cannot execute JavaScript: cross-origin restriction');
    }
  }

  async insertCSS(css: string): Promise<string> {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { insertCSS: (css: string) => Promise<string> };
      return webview.insertCSS(css);
    }

    // 浏览器 iframe：注入 style 标签
    const key = `injected-css-${Date.now()}`;
    const iframe = this.element as HTMLIFrameElement;
    try {
      const doc = iframe.contentDocument;
      if (doc) {
        const style = doc.createElement('style');
        style.id = key;
        style.textContent = css;
        doc.head.appendChild(style);
      }
    } catch {
      // 跨域限制
    }
    return key;
  }

  async removeInsertedCSS(key: string): Promise<void> {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { removeInsertedCSS: (key: string) => Promise<void> };
      return webview.removeInsertedCSS(key);
    }

    // 浏览器 iframe
    const iframe = this.element as HTMLIFrameElement;
    try {
      const doc = iframe.contentDocument;
      const style = doc?.getElementById(key);
      style?.remove();
    } catch {
      // 跨域限制
    }
  }

  // ========== 缩放 ==========

  setZoomFactor(factor: number): void {
    this._zoomFactor = factor;
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { setZoomFactor: (factor: number) => void };
      webview.setZoomFactor(factor);
    } else {
      this.element.style.transform = `scale(${factor})`;
      this.element.style.transformOrigin = 'top left';
    }
  }

  getZoomFactor(): number {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { getZoomFactor: () => number };
      return webview.getZoomFactor();
    }
    return this._zoomFactor;
  }

  setZoomLevel(level: number): void {
    this._zoomLevel = level;
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { setZoomLevel: (level: number) => void };
      webview.setZoomLevel(level);
    } else {
      // 浏览器环境：转换为缩放因子
      this.setZoomFactor(Math.pow(1.2, level));
    }
  }

  getZoomLevel(): number {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { getZoomLevel: () => number };
      return webview.getZoomLevel();
    }
    return this._zoomLevel;
  }

  // ========== 查找 ==========

  findInPage(text: string, options?: FindInPageOptions): number {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { findInPage: (text: string, options?: Electron.FindInPageOptions) => number };
      return webview.findInPage(text, options);
    }
    // 浏览器环境不支持
    return 0;
  }

  stopFindInPage(action: 'clearSelection' | 'keepSelection' | 'activateSelection'): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { stopFindInPage: (action: string) => void };
      webview.stopFindInPage(action);
    }
  }

  // ========== 开发者工具 ==========

  openDevTools(): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { openDevTools: () => void };
      webview.openDevTools();
    }
  }

  closeDevTools(): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { closeDevTools: () => void };
      webview.closeDevTools();
    }
  }

  isDevToolsOpened(): boolean {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { isDevToolsOpened: () => boolean };
      return webview.isDevToolsOpened();
    }
    return false;
  }

  toggleDevTools(): void {
    if (this.isDevToolsOpened()) {
      this.closeDevTools();
    } else {
      this.openDevTools();
    }
  }

  // ========== 其他 ==========

  setUserAgent(userAgent: string): void {
    this._userAgent = userAgent;
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { setUserAgent: (userAgent: string) => void };
      webview.setUserAgent(userAgent);
    }
  }

  getUserAgent(): string {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { getUserAgent: () => string };
      return webview.getUserAgent();
    }
    return this._userAgent || navigator.userAgent;
  }

  setAudioMuted(muted: boolean): void {
    this._audioMuted = muted;
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { setAudioMuted: (muted: boolean) => void };
      webview.setAudioMuted(muted);
    }
  }

  isAudioMuted(): boolean {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { isAudioMuted: () => boolean };
      return webview.isAudioMuted();
    }
    return this._audioMuted;
  }

  print(): void {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { print: () => void };
      webview.print();
    } else {
      const iframe = this.element as HTMLIFrameElement;
      try {
        iframe.contentWindow?.print();
      } catch {
        // 跨域限制
      }
    }
  }

  async printToPDF(options?: PrintToPDFOptions): Promise<Uint8Array> {
    if (this._isElectronWebView) {
      const webview = this.element as unknown as { printToPDF: (options?: Electron.PrintToPDFOptions) => Promise<Buffer> };
      const buffer = await webview.printToPDF(options);
      return new Uint8Array(buffer);
    }
    throw new Error('printToPDF is only supported in Electron');
  }

  // ========== 事件监听 ==========

  onDidStartLoading(handler: () => void): () => void {
    return this.on('did-start-loading', handler);
  }

  onDidStopLoading(handler: () => void): () => void {
    return this.on('did-stop-loading', handler);
  }

  onDidFailLoad(handler: (error: Error) => void): () => void {
    return this.on('did-fail-load', handler);
  }

  onPageTitleUpdated(handler: (title: string) => void): () => void {
    return this.on('page-title-updated', handler);
  }

  onDidNavigate(handler: (url: string) => void): () => void {
    return this.on('did-navigate', handler);
  }

  onDOMReady(handler: () => void): () => void {
    return this.on('dom-ready', handler);
  }

  onConsoleMessage(handler: (event: WebViewConsoleMessageEvent) => void): () => void {
    return this.on('console-message', handler);
  }

  onNewWindow(handler: (event: WebViewNewWindowEvent) => void): () => void {
    return this.on('new-window', handler);
  }

  // ========== 生命周期 ==========

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._eventListeners.clear();
    this.element.remove();
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }
}

// ============================================================================
// ChromiumCore 实现
// ============================================================================

/**
 * ChromiumCore Chromium核心
 */
export class ChromiumCore implements IChromiumCore {
  private webViews: Map<string, IWebView> = new Map();
  private ipcHandlers: Map<string, Set<(viewId: string, data: unknown) => void>> = new Map();
  private defaultConfig: WebViewConfig;

  constructor(config?: WebViewConfig) {
    this.defaultConfig = {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      ...config,
    };
  }

  // ========== WebView 管理 ==========

  createWebView(config: WebViewConfig): IWebView {
    const id = generateId();
    const mergedConfig = { ...this.defaultConfig, ...config };
    const webView = new WebViewWrapper(id, mergedConfig);
    this.webViews.set(id, webView);
    return webView;
  }

  getWebView(viewId: string): IWebView | null {
    return this.webViews.get(viewId) ?? null;
  }

  destroyWebView(viewId: string): void {
    const webView = this.webViews.get(viewId);
    if (webView) {
      webView.destroy();
      this.webViews.delete(viewId);
    }
  }

  getAllWebViews(): IWebView[] {
    return Array.from(this.webViews.values());
  }

  // ========== 渲染进程通信 ==========

  sendToRenderer(viewId: string, channel: string, data: unknown): void {
    const webView = this.webViews.get(viewId);
    if (webView && !webView.isDestroyed()) {
      // 通过 executeJavaScript 发送消息
      const message = JSON.stringify({ channel, data });
      void webView.executeJavaScript(`
        window.dispatchEvent(new CustomEvent('ipc-message', { 
          detail: ${message} 
        }));
      `);
    }
  }

  onRendererMessage(
    channel: string,
    handler: (viewId: string, data: unknown) => void
  ): () => void {
    if (!this.ipcHandlers.has(channel)) {
      this.ipcHandlers.set(channel, new Set());
    }
    this.ipcHandlers.get(channel)!.add(handler);

    return () => {
      this.ipcHandlers.get(channel)?.delete(handler);
    };
  }

  /**
   * 处理来自渲染进程的消息（内部使用）
   */
  handleRendererMessage(viewId: string, message: IPCMessage): void {
    const handlers = this.ipcHandlers.get(message.channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(viewId, message.data);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error handling IPC message on channel ${message.channel}:`, error);
        }
      }
    }
  }

  // ========== DevTools ==========

  openDevTools(viewId: string): void {
    const webView = this.webViews.get(viewId);
    if (webView) {
      webView.openDevTools();
    }
  }

  closeDevTools(viewId: string): void {
    const webView = this.webViews.get(viewId);
    if (webView) {
      webView.closeDevTools();
    }
  }

  // ========== 版本信息 ==========

  getChromiumVersion(): string {
    if (typeof process !== 'undefined' && process.versions) {
      return process.versions['chrome'] ?? 'unknown';
    }
    // 从 userAgent 提取
    const match = navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    return match?.[1] ?? 'unknown';
  }

  getV8Version(): string {
    if (typeof process !== 'undefined' && process.versions) {
      return process.versions['v8'] ?? 'unknown';
    }
    return 'unknown';
  }

  getNodeVersion(): string {
    if (typeof process !== 'undefined' && process.versions) {
      return process.versions['node'] ?? 'unknown';
    }
    return 'unknown';
  }

  getElectronVersion(): string {
    if (typeof process !== 'undefined' && process.versions) {
      return process.versions['electron'] ?? 'unknown';
    }
    return 'unknown';
  }

  // ========== 环境检测 ==========

  isElectron(): boolean {
    return isElectronAvailable();
  }

  isRenderer(): boolean {
    return isRendererProcess();
  }

  isMain(): boolean {
    return isElectronAvailable() && typeof window === 'undefined';
  }

  // ========== 平台信息 ==========

  getPlatform(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.platform;
    }
    if (typeof process !== 'undefined') {
      return process.platform;
    }
    return 'unknown';
  }

  getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return 'Chips Foundation';
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): WebViewConfig {
    return { ...this.defaultConfig };
  }
}

/**
 * 全局 Chromium 核心实例
 */
export const chromiumCore = new ChromiumCore();
