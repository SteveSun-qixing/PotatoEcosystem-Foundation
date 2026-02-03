/**
 * ElectronFramework Electron框架抽象
 * @module @chips/foundation/runtime/electron-framework/electron-framework
 *
 * 提供 Electron 原生能力的完整封装
 * 支持窗口管理、对话框、剪贴板、IPC通信、系统集成等功能
 */

import type {
  IElectronFramework,
  IBrowserWindow,
  IClipboard,
  IIPCMain,
  IMenu,
  IMenuItem,
  ITray,
  WindowConfig,
  OpenDialogOptions,
  OpenDialogResult,
  SaveDialogOptions,
  SaveDialogResult,
  MessageBoxOptions,
  MessageBoxResult,
  PathName,
  SystemInfo,
  ScreenInfo,
  Display,
  NotificationOptions,
  ProtocolHandler,
  MenuItemConfig,
  ShellOpenOptions,
  NativeImage,
} from './types';
import { WindowManager, windowManager } from './browser-window';
import { DialogManager, dialogManager } from './dialog';
import { ClipboardManager, clipboardManager } from './clipboard';
import { IPCMainManager, ipcMainManager } from './ipc-main';

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
 * 检查是否在渲染进程
 */
function isRendererProcess(): boolean {
  return isElectronAvailable() && typeof window !== 'undefined';
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
// ElectronFramework 实现
// ============================================================================

/**
 * ElectronFramework Electron框架抽象
 * 提供完整的 Electron 能力封装
 */
export class ElectronFramework implements IElectronFramework {
  private _windowManager: WindowManager;
  private _dialogManager: DialogManager;
  private _clipboardManager: ClipboardManager;
  private _ipcMainManager: IPCMainManager;
  private _protocolHandlers: Map<string, ProtocolHandler> = new Map();

  constructor() {
    this._windowManager = windowManager;
    this._dialogManager = dialogManager;
    this._clipboardManager = clipboardManager;
    this._ipcMainManager = ipcMainManager;
  }

  // ========== 环境检测 ==========

  /**
   * 检查是否在 Electron 环境
   */
  isAvailable(): boolean {
    return isElectronAvailable();
  }

  /**
   * 检查是否在主进程
   */
  isMain(): boolean {
    return isMainProcess();
  }

  /**
   * 检查是否在渲染进程
   */
  isRenderer(): boolean {
    return isRendererProcess();
  }

  // ========== 应用生命周期 ==========

  /**
   * 应用是否就绪
   */
  isReady(): boolean {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return false;
    }
    return electron.app.isReady();
  }

  /**
   * 等待应用就绪
   */
  async whenReady(): Promise<void> {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return;
    }
    await electron.app.whenReady();
  }

  /**
   * 退出应用
   */
  quit(): void {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return;
    }
    electron.app.quit();
  }

  /**
   * 重新启动应用
   */
  relaunch(options?: { args?: string[]; execPath?: string }): void {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return;
    }
    electron.app.relaunch(options);
    electron.app.quit();
  }

  /**
   * 获取应用名称
   */
  getName(): string {
    const electron = getElectron();
    if (!electron) {
      return 'Chips Application';
    }
    return electron.app.getName();
  }

  /**
   * 获取应用版本
   */
  getVersion(): string {
    const electron = getElectron();
    if (!electron) {
      return '0.0.0';
    }
    return electron.app.getVersion();
  }

  // ========== 窗口管理 ==========

  /**
   * 创建窗口
   */
  async createWindow(config: WindowConfig): Promise<IBrowserWindow> {
    return this._windowManager.createWindow(config);
  }

  /**
   * 获取窗口
   */
  getWindow(windowId: number): IBrowserWindow | null {
    return this._windowManager.getWindow(windowId);
  }

  /**
   * 获取所有窗口
   */
  getAllWindows(): IBrowserWindow[] {
    return this._windowManager.getAllWindows();
  }

  /**
   * 获取聚焦的窗口
   */
  getFocusedWindow(): IBrowserWindow | null {
    return this._windowManager.getFocusedWindow();
  }

  // ========== 系统路径 ==========

  /**
   * 获取系统路径
   */
  getPath(name: PathName): string {
    const electron = getElectron();
    if (!electron) {
      return '';
    }
    try {
      return electron.app.getPath(name as Parameters<typeof electron.app.getPath>[0]);
    } catch {
      return '';
    }
  }

  /**
   * 设置系统路径
   */
  setPath(name: PathName, path: string): void {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return;
    }
    electron.app.setPath(name as Parameters<typeof electron.app.setPath>[0], path);
  }

  /**
   * 获取应用路径
   */
  getAppPath(): string {
    const electron = getElectron();
    if (!electron) {
      return process.cwd?.() ?? '';
    }
    return electron.app.getAppPath();
  }

  /**
   * 获取用户数据路径
   */
  getUserDataPath(): string {
    return this.getPath('userData');
  }

  /**
   * 获取桌面路径
   */
  getDesktopPath(): string {
    return this.getPath('desktop');
  }

  /**
   * 获取文档路径
   */
  getDocumentsPath(): string {
    return this.getPath('documents');
  }

  /**
   * 获取下载路径
   */
  getDownloadsPath(): string {
    return this.getPath('downloads');
  }

  /**
   * 获取临时目录路径
   */
  getTempPath(): string {
    return this.getPath('temp');
  }

  // ========== 对话框 ==========

  /**
   * 显示打开对话框
   */
  async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
    return this._dialogManager.showOpenDialog(options);
  }

  /**
   * 显示保存对话框
   */
  async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
    return this._dialogManager.showSaveDialog(options);
  }

  /**
   * 显示消息框
   */
  async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    return this._dialogManager.showMessageBox(options);
  }

  // ========== 剪贴板 ==========

  /**
   * 剪贴板
   */
  get clipboard(): IClipboard {
    return this._clipboardManager;
  }

  // ========== 系统托盘 ==========

  /**
   * 创建系统托盘
   */
  createTray(iconPath: string): ITray {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      throw new Error('Tray can only be created in Electron main process');
    }

    const { Tray } = electron;
    const tray = new Tray(iconPath);

    // 封装 Tray 接口
    return {
      setImage: (image: string | NativeImage) => tray.setImage(image as string),
      setPressedImage: (image: NativeImage) => tray.setPressedImage(image as unknown as Electron.NativeImage),
      setToolTip: (toolTip: string) => tray.setToolTip(toolTip),
      setTitle: (title: string) => tray.setTitle(title),
      getTitle: () => tray.getTitle(),
      setIgnoreDoubleClickEvents: (ignore: boolean) => tray.setIgnoreDoubleClickEvents(ignore),
      getIgnoreDoubleClickEvents: () => tray.getIgnoreDoubleClickEvents(),
      displayBalloon: (options: { icon?: NativeImage; title: string; content: string }) =>
        tray.displayBalloon({
          icon: options.icon as unknown as Electron.NativeImage,
          title: options.title,
          content: options.content,
        }),
      removeBalloon: () => tray.removeBalloon(),
      getBounds: () => tray.getBounds(),
      setContextMenu: (menu: IMenu | null) =>
        tray.setContextMenu(menu ? (menu as unknown as Electron.Menu) : null),
      popUpContextMenu: (menu?: IMenu, position?: { x: number; y: number }) =>
        tray.popUpContextMenu(menu as unknown as Electron.Menu, position),
      closeContextMenu: () => tray.closeContextMenu(),
      destroy: () => tray.destroy(),
      isDestroyed: () => tray.isDestroyed(),
      on: (event: string, handler: (...args: unknown[]) => void) =>
        tray.on(event as Parameters<typeof tray.on>[0], handler),
    };
  }

  // ========== 应用菜单 ==========

  /**
   * 设置应用菜单
   */
  setApplicationMenu(menu: IMenu | null): void {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return;
    }
    const { Menu } = electron;
    Menu.setApplicationMenu(menu as unknown as Electron.Menu | null);
  }

  /**
   * 获取应用菜单
   */
  getApplicationMenu(): IMenu | null {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return null;
    }
    const { Menu } = electron;
    return Menu.getApplicationMenu() as unknown as IMenu | null;
  }

  /**
   * 创建菜单
   */
  createMenu(template?: MenuItemConfig[]): IMenu {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      throw new Error('Menu can only be created in Electron main process');
    }

    const { Menu } = electron;
    if (template) {
      return Menu.buildFromTemplate(template as unknown as Electron.MenuItemConstructorOptions[]) as unknown as IMenu;
    }
    return new Menu() as unknown as IMenu;
  }

  /**
   * 创建菜单项
   */
  createMenuItem(options: MenuItemConfig): IMenuItem {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      throw new Error('MenuItem can only be created in Electron main process');
    }

    const { MenuItem } = electron;
    return new MenuItem(options as unknown as Electron.MenuItemConstructorOptions) as unknown as IMenuItem;
  }

  // ========== 协议处理 ==========

  /**
   * 注册协议
   */
  registerProtocol(scheme: string, handler: ProtocolHandler): void {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return;
    }

    const { protocol } = electron;
    
    // 保存处理器
    this._protocolHandlers.set(scheme, handler);

    // 注册协议
    protocol.handle(scheme, async (request) => {
      const result = await handler({
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        method: request.method,
      });
      return new Response(result.data, {
        headers: { 'Content-Type': result.mimeType },
      });
    });
  }

  /**
   * 注销协议
   */
  unregisterProtocol(scheme: string): void {
    const electron = getElectron();
    if (!electron || !this.isMain()) {
      return;
    }

    const { protocol } = electron;
    
    // 移除处理器
    this._protocolHandlers.delete(scheme);
    
    // 注销协议
    protocol.unhandle(scheme);
  }

  // ========== IPC通信 ==========

  /**
   * IPC 主进程
   */
  get ipcMain(): IIPCMain {
    return this._ipcMainManager;
  }

  // ========== Shell操作 ==========

  /**
   * 在文件管理器中显示
   */
  showItemInFolder(path: string): void {
    const electron = getElectron();
    if (!electron) {
      return;
    }
    electron.shell.showItemInFolder(path);
  }

  /**
   * 打开路径
   */
  async openPath(path: string): Promise<string> {
    const electron = getElectron();
    if (!electron) {
      return 'Electron not available';
    }
    return electron.shell.openPath(path);
  }

  /**
   * 打开外部链接
   */
  async openExternal(url: string, options?: ShellOpenOptions): Promise<void> {
    const electron = getElectron();
    if (!electron) {
      // 浏览器环境
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
      return;
    }
    await electron.shell.openExternal(url, options);
  }

  /**
   * 移动到回收站
   */
  async trashItem(path: string): Promise<void> {
    const electron = getElectron();
    if (!electron) {
      throw new Error('trashItem requires Electron');
    }
    await electron.shell.trashItem(path);
  }

  /**
   * 发出系统提示音
   */
  beep(): void {
    const electron = getElectron();
    if (!electron) {
      return;
    }
    electron.shell.beep();
  }

  // ========== 系统信息 ==========

  /**
   * 获取系统信息
   */
  getSystemInfo(): SystemInfo {
    const versions = typeof process !== 'undefined' ? process.versions : {};
    return {
      platform: typeof process !== 'undefined' ? (process.platform as NodeJS.Platform) : 'browser',
      arch: typeof process !== 'undefined' ? process.arch : 'unknown',
      electronVersion: versions?.['electron'] ?? 'unknown',
      chromeVersion: versions?.['chrome'] ?? 'unknown',
      nodeVersion: versions?.['node'] ?? 'unknown',
      v8Version: versions?.['v8'] ?? 'unknown',
    };
  }

  /**
   * 获取屏幕信息
   */
  getScreenInfo(): ScreenInfo {
    if (typeof window !== 'undefined') {
      return {
        width: window.screen.width,
        height: window.screen.height,
        scaleFactor: window.devicePixelRatio,
        availableWidth: window.screen.availWidth,
        availableHeight: window.screen.availHeight,
      };
    }
    return { width: 0, height: 0, scaleFactor: 1 };
  }

  /**
   * 获取主显示器
   */
  getPrimaryDisplay(): Display {
    const electron = getElectron();
    if (!electron) {
      return this.getDefaultDisplay();
    }
    const { screen } = electron;
    return screen.getPrimaryDisplay() as unknown as Display;
  }

  /**
   * 获取所有显示器
   */
  getAllDisplays(): Display[] {
    const electron = getElectron();
    if (!electron) {
      return [this.getDefaultDisplay()];
    }
    const { screen } = electron;
    return screen.getAllDisplays() as unknown as Display[];
  }

  /**
   * 获取默认显示器信息（浏览器环境）
   */
  private getDefaultDisplay(): Display {
    const screenInfo = this.getScreenInfo();
    return {
      id: 0,
      rotation: 0,
      scaleFactor: screenInfo.scaleFactor,
      touchSupport: 'unknown',
      monochrome: false,
      accelerometerSupport: 'unknown',
      colorSpace: 'srgb',
      colorDepth: 24,
      depthPerComponent: 8,
      displayFrequency: 60,
      bounds: { x: 0, y: 0, width: screenInfo.width, height: screenInfo.height },
      workArea: {
        x: 0,
        y: 0,
        width: screenInfo.availableWidth ?? screenInfo.width,
        height: screenInfo.availableHeight ?? screenInfo.height,
      },
      size: { width: screenInfo.width, height: screenInfo.height },
      workAreaSize: {
        width: screenInfo.availableWidth ?? screenInfo.width,
        height: screenInfo.availableHeight ?? screenInfo.height,
      },
      internal: true,
    };
  }

  // ========== 通知 ==========

  /**
   * 显示通知
   */
  showNotification(title: string, body: string, options?: NotificationOptions): void {
    const electron = getElectron();
    if (electron && this.isMain()) {
      const { Notification } = electron;
      const notification = new Notification({
        title,
        body,
        ...options,
      });
      notification.show();
      return;
    }

    // 浏览器环境
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, ...options });
      } else if (Notification.permission !== 'denied') {
        void Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title, { body, ...options });
          }
        });
      }
    }
  }

  /**
   * 是否支持通知
   */
  isNotificationSupported(): boolean {
    const electron = getElectron();
    if (electron) {
      const { Notification } = electron;
      return Notification.isSupported();
    }
    return typeof Notification !== 'undefined';
  }
}

/**
 * 全局 Electron 框架实例
 */
export const electronFramework = new ElectronFramework();
