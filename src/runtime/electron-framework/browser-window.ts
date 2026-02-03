/**
 * BrowserWindow 封装
 * @module @chips/foundation/runtime/electron-framework/browser-window
 *
 * 提供 Electron BrowserWindow 的封装和抽象
 */

import type {
  IBrowserWindow,
  IWebContents,
  WindowConfig,
  Rectangle,
  WindowEvent,
  PrintOptions,
  PrintToPDFOptions,
} from './types';

// ============================================================================
// 类型守卫
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
// WebContents 封装
// ============================================================================

/**
 * WebContents 封装类
 */
export class WebContentsWrapper implements IWebContents {
  private _webContents: Electron.WebContents | null;

  constructor(webContents: Electron.WebContents | null) {
    this._webContents = webContents;
  }

  /**
   * 获取原始 WebContents
   */
  get raw(): Electron.WebContents | null {
    return this._webContents;
  }

  /**
   * WebContents ID
   */
  get id(): number {
    return this._webContents?.id ?? -1;
  }

  /**
   * 发送消息到渲染进程
   */
  send(channel: string, ...args: unknown[]): void {
    this._webContents?.send(channel, ...args);
  }

  /**
   * 执行 JavaScript
   */
  async executeJavaScript(code: string): Promise<unknown> {
    if (!this._webContents) {
      throw new Error('WebContents not available');
    }
    return this._webContents.executeJavaScript(code);
  }

  /**
   * 注入 CSS
   */
  async insertCSS(css: string): Promise<string> {
    if (!this._webContents) {
      throw new Error('WebContents not available');
    }
    return this._webContents.insertCSS(css);
  }

  /**
   * 移除注入的 CSS
   */
  async removeInsertedCSS(key: string): Promise<void> {
    if (!this._webContents) {
      throw new Error('WebContents not available');
    }
    return this._webContents.removeInsertedCSS(key);
  }

  /**
   * 打开开发者工具
   */
  openDevTools(): void {
    this._webContents?.openDevTools();
  }

  /**
   * 关闭开发者工具
   */
  closeDevTools(): void {
    this._webContents?.closeDevTools();
  }

  /**
   * 开发者工具是否打开
   */
  isDevToolsOpened(): boolean {
    return this._webContents?.isDevToolsOpened() ?? false;
  }

  /**
   * 切换开发者工具
   */
  toggleDevTools(): void {
    this._webContents?.toggleDevTools();
  }

  /**
   * 获取 URL
   */
  getURL(): string {
    return this._webContents?.getURL() ?? '';
  }

  /**
   * 获取标题
   */
  getTitle(): string {
    return this._webContents?.getTitle() ?? '';
  }

  /**
   * 是否正在加载
   */
  isLoading(): boolean {
    return this._webContents?.isLoading() ?? false;
  }

  /**
   * 是否正在等待响应
   */
  isWaitingForResponse(): boolean {
    return this._webContents?.isWaitingForResponse() ?? false;
  }

  /**
   * 停止加载
   */
  stop(): void {
    this._webContents?.stop();
  }

  /**
   * 重新加载
   */
  reload(): void {
    this._webContents?.reload();
  }

  /**
   * 可以后退
   */
  canGoBack(): boolean {
    return this._webContents?.canGoBack() ?? false;
  }

  /**
   * 可以前进
   */
  canGoForward(): boolean {
    return this._webContents?.canGoForward() ?? false;
  }

  /**
   * 后退
   */
  goBack(): void {
    this._webContents?.goBack();
  }

  /**
   * 前进
   */
  goForward(): void {
    this._webContents?.goForward();
  }

  /**
   * 设置缩放级别
   */
  setZoomLevel(level: number): void {
    this._webContents?.setZoomLevel(level);
  }

  /**
   * 获取缩放级别
   */
  getZoomLevel(): number {
    return this._webContents?.getZoomLevel() ?? 0;
  }

  /**
   * 设置缩放因子
   */
  setZoomFactor(factor: number): void {
    this._webContents?.setZoomFactor(factor);
  }

  /**
   * 获取缩放因子
   */
  getZoomFactor(): number {
    return this._webContents?.getZoomFactor() ?? 1;
  }

  /**
   * 打印
   */
  print(options?: PrintOptions): void {
    this._webContents?.print(options as Electron.WebContentsPrintOptions);
  }

  /**
   * 打印为 PDF
   */
  async printToPDF(options: PrintToPDFOptions): Promise<Buffer> {
    if (!this._webContents) {
      throw new Error('WebContents not available');
    }
    return this._webContents.printToPDF(options as Electron.PrintToPDFOptions);
  }
}

// ============================================================================
// BrowserWindow 封装
// ============================================================================

/**
 * BrowserWindow 封装类
 */
export class BrowserWindowWrapper implements IBrowserWindow {
  private _window: Electron.BrowserWindow | null;
  private _webContents: WebContentsWrapper;
  private _eventHandlers: Map<WindowEvent, Set<() => void>> = new Map();

  constructor(window: Electron.BrowserWindow | null) {
    this._window = window;
    this._webContents = new WebContentsWrapper(window?.webContents ?? null);
  }

  /**
   * 获取原始 BrowserWindow
   */
  get raw(): Electron.BrowserWindow | null {
    return this._window;
  }

  /**
   * 窗口 ID
   */
  get id(): number {
    return this._window?.id ?? -1;
  }

  /**
   * WebContents
   */
  get webContents(): IWebContents {
    return this._webContents;
  }

  // ========== 窗口操作 ==========

  /**
   * 显示窗口
   */
  show(): void {
    this._window?.show();
  }

  /**
   * 隐藏窗口
   */
  hide(): void {
    this._window?.hide();
  }

  /**
   * 关闭窗口
   */
  close(): void {
    this._window?.close();
  }

  /**
   * 销毁窗口
   */
  destroy(): void {
    this._window?.destroy();
    this._window = null;
  }

  /**
   * 聚焦窗口
   */
  focus(): void {
    this._window?.focus();
  }

  /**
   * 取消聚焦
   */
  blur(): void {
    this._window?.blur();
  }

  // ========== 窗口状态 ==========

  /**
   * 最小化
   */
  minimize(): void {
    this._window?.minimize();
  }

  /**
   * 最大化
   */
  maximize(): void {
    this._window?.maximize();
  }

  /**
   * 取消最大化
   */
  unmaximize(): void {
    this._window?.unmaximize();
  }

  /**
   * 还原
   */
  restore(): void {
    this._window?.restore();
  }

  /**
   * 是否最小化
   */
  isMinimized(): boolean {
    return this._window?.isMinimized() ?? false;
  }

  /**
   * 是否最大化
   */
  isMaximized(): boolean {
    return this._window?.isMaximized() ?? false;
  }

  /**
   * 是否可见
   */
  isVisible(): boolean {
    return this._window?.isVisible() ?? false;
  }

  /**
   * 是否聚焦
   */
  isFocused(): boolean {
    return this._window?.isFocused() ?? false;
  }

  /**
   * 是否已销毁
   */
  isDestroyed(): boolean {
    return this._window?.isDestroyed() ?? true;
  }

  /**
   * 是否全屏
   */
  isFullScreen(): boolean {
    return this._window?.isFullScreen() ?? false;
  }

  /**
   * 设置全屏
   */
  setFullScreen(flag: boolean): void {
    this._window?.setFullScreen(flag);
  }

  // ========== 位置和大小 ==========

  /**
   * 设置边界
   */
  setBounds(bounds: Rectangle): void {
    this._window?.setBounds(bounds);
  }

  /**
   * 获取边界
   */
  getBounds(): Rectangle {
    return this._window?.getBounds() ?? { x: 0, y: 0, width: 0, height: 0 };
  }

  /**
   * 设置位置
   */
  setPosition(x: number, y: number): void {
    this._window?.setPosition(x, y);
  }

  /**
   * 获取位置
   */
  getPosition(): [number, number] {
    return this._window?.getPosition() as [number, number] ?? [0, 0];
  }

  /**
   * 设置大小
   */
  setSize(width: number, height: number): void {
    this._window?.setSize(width, height);
  }

  /**
   * 获取大小
   */
  getSize(): [number, number] {
    return this._window?.getSize() as [number, number] ?? [0, 0];
  }

  /**
   * 居中
   */
  center(): void {
    this._window?.center();
  }

  /**
   * 设置内容大小
   */
  setContentSize(width: number, height: number): void {
    this._window?.setContentSize(width, height);
  }

  /**
   * 获取内容大小
   */
  getContentSize(): [number, number] {
    return this._window?.getContentSize() as [number, number] ?? [0, 0];
  }

  /**
   * 设置最小大小
   */
  setMinimumSize(width: number, height: number): void {
    this._window?.setMinimumSize(width, height);
  }

  /**
   * 获取最小大小
   */
  getMinimumSize(): [number, number] {
    return this._window?.getMinimumSize() as [number, number] ?? [0, 0];
  }

  /**
   * 设置最大大小
   */
  setMaximumSize(width: number, height: number): void {
    this._window?.setMaximumSize(width, height);
  }

  /**
   * 获取最大大小
   */
  getMaximumSize(): [number, number] {
    return this._window?.getMaximumSize() as [number, number] ?? [0, 0];
  }

  /**
   * 设置可调整大小
   */
  setResizable(resizable: boolean): void {
    this._window?.setResizable(resizable);
  }

  /**
   * 是否可调整大小
   */
  isResizable(): boolean {
    return this._window?.isResizable() ?? true;
  }

  // ========== 标题 ==========

  /**
   * 设置标题
   */
  setTitle(title: string): void {
    this._window?.setTitle(title);
  }

  /**
   * 获取标题
   */
  getTitle(): string {
    return this._window?.getTitle() ?? '';
  }

  // ========== 内容加载 ==========

  /**
   * 加载 URL
   */
  async loadURL(url: string): Promise<void> {
    if (!this._window) {
      throw new Error('BrowserWindow not available');
    }
    await this._window.loadURL(url);
  }

  /**
   * 加载文件
   */
  async loadFile(filePath: string): Promise<void> {
    if (!this._window) {
      throw new Error('BrowserWindow not available');
    }
    await this._window.loadFile(filePath);
  }

  /**
   * 重新加载
   */
  reload(): void {
    this._window?.reload();
  }

  // ========== 事件 ==========

  /**
   * 监听事件
   * @returns 取消监听函数
   */
  on(event: WindowEvent, handler: () => void): () => void {
    if (!this._window) {
      return () => {};
    }

    // 保存处理器引用
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler);

    // 绑定事件
    this._window.on(event as Parameters<Electron.BrowserWindow['on']>[0], handler);

    // 返回取消监听函数
    return () => {
      this._eventHandlers.get(event)?.delete(handler);
      this._window?.off(event as Parameters<Electron.BrowserWindow['off']>[0], handler);
    };
  }

  /**
   * 单次监听事件
   */
  once(event: WindowEvent, handler: () => void): void {
    this._window?.once(event as Parameters<Electron.BrowserWindow['once']>[0], handler);
  }
}

// ============================================================================
// 窗口管理器
// ============================================================================

/**
 * 窗口管理器
 * 管理所有 BrowserWindow 实例
 */
export class WindowManager {
  private windows: Map<number, BrowserWindowWrapper> = new Map();

  /**
   * 创建窗口
   * @param config 窗口配置
   * @returns 窗口封装
   */
  async createWindow(config: WindowConfig): Promise<IBrowserWindow> {
    const electron = getElectron();
    if (!electron) {
      throw new Error('Electron is not available');
    }

    const { BrowserWindow } = electron;

    // 转换配置
    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      width: config.width ?? 800,
      height: config.height ?? 600,
      minWidth: config.minWidth,
      minHeight: config.minHeight,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
      x: config.x,
      y: config.y,
      center: config.center,
      title: config.title ?? 'Chips Application',
      frame: config.frame ?? true,
      transparent: config.transparent ?? false,
      resizable: config.resizable ?? true,
      fullscreen: config.fullscreen ?? false,
      fullscreenable: config.fullscreenable ?? true,
      autoHideMenuBar: config.autoHideMenuBar ?? false,
      backgroundColor: config.backgroundColor,
      show: config.show ?? false,
      icon: config.icon,
      webPreferences: config.webPreferences
        ? {
            preload: config.webPreferences.preload,
            nodeIntegration: config.webPreferences.nodeIntegration ?? false,
            contextIsolation: config.webPreferences.contextIsolation ?? true,
            sandbox: config.webPreferences.sandbox ?? false,
            webSecurity: config.webPreferences.webSecurity ?? true,
            allowRunningInsecureContent: config.webPreferences.allowRunningInsecureContent ?? false,
            webgl: config.webPreferences.webgl ?? true,
            defaultFontSize: config.webPreferences.defaultFontSize,
            defaultFontFamily: config.webPreferences.defaultFontFamily,
          }
        : {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
          },
    };

    // 创建窗口
    const window = new BrowserWindow(windowOptions);
    const wrapper = new BrowserWindowWrapper(window);

    // 保存窗口引用
    this.windows.set(window.id, wrapper);

    // 监听关闭事件，清理引用
    window.on('closed', () => {
      this.windows.delete(window.id);
    });

    return wrapper;
  }

  /**
   * 获取窗口
   * @param windowId 窗口 ID
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

  /**
   * 获取聚焦的窗口
   */
  getFocusedWindow(): IBrowserWindow | null {
    const electron = getElectron();
    if (!electron) {
      return null;
    }

    const { BrowserWindow } = electron;
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) {
      return null;
    }

    return this.windows.get(focusedWindow.id) ?? null;
  }

  /**
   * 关闭所有窗口
   */
  closeAllWindows(): void {
    for (const window of this.windows.values()) {
      window.close();
    }
  }

  /**
   * 销毁所有窗口
   */
  destroyAllWindows(): void {
    for (const window of this.windows.values()) {
      window.destroy();
    }
    this.windows.clear();
  }
}

/**
 * 全局窗口管理器实例
 */
export const windowManager = new WindowManager();
