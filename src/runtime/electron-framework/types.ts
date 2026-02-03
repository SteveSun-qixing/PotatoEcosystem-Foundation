/**
 * ElectronFramework 类型定义
 * @module @chips/foundation/runtime/electron-framework/types
 *
 * 提供 Electron 相关的完整类型定义
 */

// ============================================================================
// 窗口相关类型
// ============================================================================

/**
 * 矩形区域
 */
export interface Rectangle {
  /** X坐标 */
  x: number;
  /** Y坐标 */
  y: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}

/**
 * 窗口配置
 */
export interface WindowConfig {
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
  /** X坐标 */
  x?: number;
  /** Y坐标 */
  y?: number;
  /** 是否居中显示 */
  center?: boolean;
  /** 窗口标题 */
  title?: string;
  /** 是否显示窗口框架 */
  frame?: boolean;
  /** 是否透明 */
  transparent?: boolean;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 是否全屏 */
  fullscreen?: boolean;
  /** 是否可全屏 */
  fullscreenable?: boolean;
  /** 是否自动隐藏菜单栏 */
  autoHideMenuBar?: boolean;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否在创建时显示 */
  show?: boolean;
  /** 窗口图标路径 */
  icon?: string;
  /** WebPreferences 配置 */
  webPreferences?: WebPreferencesConfig;
}

/**
 * WebPreferences 配置
 */
export interface WebPreferencesConfig {
  /** 预加载脚本路径 */
  preload?: string;
  /** 是否启用 Node.js 集成 */
  nodeIntegration?: boolean;
  /** 是否启用上下文隔离 */
  contextIsolation?: boolean;
  /** 是否启用沙箱 */
  sandbox?: boolean;
  /** 是否启用 Web 安全 */
  webSecurity?: boolean;
  /** 是否允许运行不安全内容 */
  allowRunningInsecureContent?: boolean;
  /** 是否启用 WebGL */
  webgl?: boolean;
  /** 默认字体大小 */
  defaultFontSize?: number;
  /** 默认字体 */
  defaultFontFamily?: {
    standard?: string;
    serif?: string;
    sansSerif?: string;
    monospace?: string;
  };
}

/**
 * 窗口事件类型
 */
export type WindowEvent =
  | 'close'
  | 'closed'
  | 'focus'
  | 'blur'
  | 'maximize'
  | 'unmaximize'
  | 'minimize'
  | 'restore'
  | 'ready-to-show'
  | 'show'
  | 'hide'
  | 'enter-full-screen'
  | 'leave-full-screen'
  | 'move'
  | 'resize';

// ============================================================================
// 对话框相关类型
// ============================================================================

/**
 * 文件过滤器
 */
export interface FileFilter {
  /** 过滤器名称 */
  name: string;
  /** 扩展名列表 */
  extensions: string[];
}

/**
 * 打开对话框选项
 */
export interface OpenDialogOptions {
  /** 对话框标题 */
  title?: string;
  /** 默认路径 */
  defaultPath?: string;
  /** 按钮标签 */
  buttonLabel?: string;
  /** 文件过滤器 */
  filters?: FileFilter[];
  /** 属性配置 */
  properties?: (
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
  )[];
  /** 消息 */
  message?: string;
  /** 安全作用域书签 */
  securityScopedBookmarks?: boolean;
}

/**
 * 打开对话框结果
 */
export interface OpenDialogResult {
  /** 是否取消 */
  canceled: boolean;
  /** 选择的文件路径列表 */
  filePaths: string[];
  /** 书签数据（macOS） */
  bookmarks?: string[];
}

/**
 * 保存对话框选项
 */
export interface SaveDialogOptions {
  /** 对话框标题 */
  title?: string;
  /** 默认路径 */
  defaultPath?: string;
  /** 按钮标签 */
  buttonLabel?: string;
  /** 文件过滤器 */
  filters?: FileFilter[];
  /** 消息 */
  message?: string;
  /** 名称字段标签 */
  nameFieldLabel?: string;
  /** 是否显示标签字段 */
  showsTagField?: boolean;
  /** 属性配置 */
  properties?: ('showHiddenFiles' | 'createDirectory' | 'showOverwriteConfirmation')[];
  /** 安全作用域书签 */
  securityScopedBookmarks?: boolean;
}

/**
 * 保存对话框结果
 */
export interface SaveDialogResult {
  /** 是否取消 */
  canceled: boolean;
  /** 选择的文件路径 */
  filePath?: string;
  /** 书签数据（macOS） */
  bookmark?: string;
}

/**
 * 消息框选项
 */
export interface MessageBoxOptions {
  /** 消息框类型 */
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  /** 按钮列表 */
  buttons?: string[];
  /** 默认按钮索引 */
  defaultId?: number;
  /** 取消按钮索引 */
  cancelId?: number;
  /** 标题 */
  title?: string;
  /** 消息 */
  message: string;
  /** 详细信息 */
  detail?: string;
  /** 复选框标签 */
  checkboxLabel?: string;
  /** 复选框默认选中状态 */
  checkboxChecked?: boolean;
  /** 图标路径 */
  icon?: string;
  /** 是否将时间格式化为本地时间 */
  noLink?: boolean;
  /** 是否标准化访问键 */
  normalizeAccessKeys?: boolean;
}

/**
 * 消息框结果
 */
export interface MessageBoxResult {
  /** 点击的按钮索引 */
  response: number;
  /** 复选框是否选中 */
  checkboxChecked: boolean;
}

// ============================================================================
// 路径相关类型
// ============================================================================

/**
 * 系统路径名称
 */
export type PathName =
  | 'home'
  | 'appData'
  | 'userData'
  | 'sessionData'
  | 'temp'
  | 'documents'
  | 'downloads'
  | 'desktop'
  | 'music'
  | 'pictures'
  | 'videos'
  | 'logs'
  | 'exe'
  | 'module'
  | 'crashDumps';

// ============================================================================
// IPC 相关类型
// ============================================================================

/**
 * IPC 主进程事件
 */
export interface IpcMainEvent {
  /** 发送者 WebContents ID */
  frameId: number;
  /** 回复函数 */
  reply: (channel: string, ...args: unknown[]) => void;
  /** 发送者 WebContents */
  sender: IWebContents;
}

/**
 * IPC 主进程调用事件
 */
export interface IpcMainInvokeEvent {
  /** 发送者 WebContents ID */
  frameId: number;
  /** 发送者 WebContents */
  sender: IWebContents;
}

/**
 * IPC 处理器类型
 */
export type IpcHandler = (...args: unknown[]) => unknown | Promise<unknown>;

// ============================================================================
// 系统信息类型
// ============================================================================

/**
 * 系统信息
 */
export interface SystemInfo {
  /** 平台 */
  platform: NodeJS.Platform | 'browser';
  /** 架构 */
  arch: string;
  /** Electron 版本 */
  electronVersion: string;
  /** Chrome 版本 */
  chromeVersion: string;
  /** Node.js 版本 */
  nodeVersion: string;
  /** V8 版本 */
  v8Version: string;
}

/**
 * 屏幕信息
 */
export interface ScreenInfo {
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
  /** 缩放因子 */
  scaleFactor: number;
  /** 可用宽度 */
  availableWidth?: number;
  /** 可用高度 */
  availableHeight?: number;
}

/**
 * 显示器信息
 */
export interface Display {
  /** 显示器 ID */
  id: number;
  /** 旋转角度 */
  rotation: number;
  /** 缩放因子 */
  scaleFactor: number;
  /** 触摸支持 */
  touchSupport: 'available' | 'unavailable' | 'unknown';
  /** 单色显示 */
  monochrome: boolean;
  /** 加速器 2D 画布 */
  accelerometerSupport: 'available' | 'unavailable' | 'unknown';
  /** 颜色空间 */
  colorSpace: string;
  /** 颜色深度 */
  colorDepth: number;
  /** 深度每组件 */
  depthPerComponent: number;
  /** 显示器频率 */
  displayFrequency: number;
  /** 边界 */
  bounds: Rectangle;
  /** 工作区 */
  workArea: Rectangle;
  /** 大小 */
  size: { width: number; height: number };
  /** 工作区大小 */
  workAreaSize: { width: number; height: number };
  /** 是否为内部显示器 */
  internal: boolean;
}

// ============================================================================
// 通知相关类型
// ============================================================================

/**
 * 通知选项
 */
export interface NotificationOptions {
  /** 副标题 */
  subtitle?: string;
  /** 正文 */
  body?: string;
  /** 是否静音 */
  silent?: boolean;
  /** 图标 */
  icon?: string;
  /** 是否有回复按钮 */
  hasReply?: boolean;
  /** 超时类型 */
  timeoutType?: 'default' | 'never';
  /** 回复占位符 */
  replyPlaceholder?: string;
  /** 声音 */
  sound?: string;
  /** 紧急程度 */
  urgency?: 'normal' | 'critical' | 'low';
  /** 关闭按钮文本 */
  closeButtonText?: string;
  /** 点击时触发应用 */
  toastXml?: string;
}

// ============================================================================
// 原生图片类型
// ============================================================================

/**
 * 原生图片接口
 */
export interface NativeImage {
  /** 转换为 PNG */
  toPNG(): Buffer;
  /** 转换为 JPEG */
  toJPEG(quality: number): Buffer;
  /** 转换为 Bitmap */
  toBitmap(): Buffer;
  /** 转换为 DataURL */
  toDataURL(): string;
  /** 获取大小 */
  getSize(): { width: number; height: number };
  /** 是否为空 */
  isEmpty(): boolean;
  /** 获取宽高比 */
  getAspectRatio(): number;
  /** 调整大小 */
  resize(options: { width?: number; height?: number; quality?: string }): NativeImage;
  /** 裁剪 */
  crop(rect: Rectangle): NativeImage;
}

// ============================================================================
// 窗口接口
// ============================================================================

/**
 * 浏览器窗口接口
 */
export interface IBrowserWindow {
  /** 窗口 ID */
  readonly id: number;

  // 窗口操作
  /** 显示窗口 */
  show(): void;
  /** 隐藏窗口 */
  hide(): void;
  /** 关闭窗口 */
  close(): void;
  /** 销毁窗口 */
  destroy(): void;
  /** 聚焦窗口 */
  focus(): void;
  /** 取消聚焦 */
  blur(): void;

  // 窗口状态
  /** 最小化 */
  minimize(): void;
  /** 最大化 */
  maximize(): void;
  /** 取消最大化 */
  unmaximize(): void;
  /** 还原 */
  restore(): void;
  /** 是否最小化 */
  isMinimized(): boolean;
  /** 是否最大化 */
  isMaximized(): boolean;
  /** 是否可见 */
  isVisible(): boolean;
  /** 是否聚焦 */
  isFocused(): boolean;
  /** 是否已销毁 */
  isDestroyed(): boolean;
  /** 是否全屏 */
  isFullScreen(): boolean;
  /** 设置全屏 */
  setFullScreen(flag: boolean): void;

  // 位置和大小
  /** 设置边界 */
  setBounds(bounds: Rectangle): void;
  /** 获取边界 */
  getBounds(): Rectangle;
  /** 设置位置 */
  setPosition(x: number, y: number): void;
  /** 获取位置 */
  getPosition(): [number, number];
  /** 设置大小 */
  setSize(width: number, height: number): void;
  /** 获取大小 */
  getSize(): [number, number];
  /** 居中 */
  center(): void;
  /** 设置内容大小 */
  setContentSize(width: number, height: number): void;
  /** 获取内容大小 */
  getContentSize(): [number, number];
  /** 设置最小大小 */
  setMinimumSize(width: number, height: number): void;
  /** 获取最小大小 */
  getMinimumSize(): [number, number];
  /** 设置最大大小 */
  setMaximumSize(width: number, height: number): void;
  /** 获取最大大小 */
  getMaximumSize(): [number, number];
  /** 设置可调整大小 */
  setResizable(resizable: boolean): void;
  /** 是否可调整大小 */
  isResizable(): boolean;

  // 标题
  /** 设置标题 */
  setTitle(title: string): void;
  /** 获取标题 */
  getTitle(): string;

  // 内容加载
  /** 加载 URL */
  loadURL(url: string): Promise<void>;
  /** 加载文件 */
  loadFile(filePath: string): Promise<void>;
  /** 重新加载 */
  reload(): void;

  // 事件
  /** 监听事件 */
  on(event: WindowEvent, handler: () => void): () => void;
  /** 单次监听事件 */
  once(event: WindowEvent, handler: () => void): void;

  // WebContents
  /** Web内容 */
  webContents: IWebContents;
}

/**
 * WebContents 接口
 */
export interface IWebContents {
  /** WebContents ID */
  readonly id: number;

  /** 发送消息到渲染进程 */
  send(channel: string, ...args: unknown[]): void;
  /** 执行 JavaScript */
  executeJavaScript(code: string): Promise<unknown>;
  /** 注入 CSS */
  insertCSS(css: string): Promise<string>;
  /** 移除注入的 CSS */
  removeInsertedCSS(key: string): Promise<void>;
  /** 打开开发者工具 */
  openDevTools(): void;
  /** 关闭开发者工具 */
  closeDevTools(): void;
  /** 开发者工具是否打开 */
  isDevToolsOpened(): boolean;
  /** 切换开发者工具 */
  toggleDevTools(): void;
  /** 获取 URL */
  getURL(): string;
  /** 获取标题 */
  getTitle(): string;
  /** 是否正在加载 */
  isLoading(): boolean;
  /** 是否正在等待响应 */
  isWaitingForResponse(): boolean;
  /** 停止加载 */
  stop(): void;
  /** 重新加载 */
  reload(): void;
  /** 可以后退 */
  canGoBack(): boolean;
  /** 可以前进 */
  canGoForward(): boolean;
  /** 后退 */
  goBack(): void;
  /** 前进 */
  goForward(): void;
  /** 设置缩放级别 */
  setZoomLevel(level: number): void;
  /** 获取缩放级别 */
  getZoomLevel(): number;
  /** 设置缩放因子 */
  setZoomFactor(factor: number): void;
  /** 获取缩放因子 */
  getZoomFactor(): number;
  /** 打印 */
  print(options?: PrintOptions): void;
  /** 打印为 PDF */
  printToPDF(options: PrintToPDFOptions): Promise<Buffer>;
}

/**
 * 打印选项
 */
export interface PrintOptions {
  /** 是否静默打印 */
  silent?: boolean;
  /** 是否打印背景 */
  printBackground?: boolean;
  /** 设备名称 */
  deviceName?: string;
  /** 颜色模式 */
  color?: boolean;
  /** 边距 */
  margins?: {
    marginType?: 'default' | 'none' | 'printableArea' | 'custom';
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** 横向 */
  landscape?: boolean;
  /** 缩放因子 */
  scaleFactor?: number;
  /** 每张页数 */
  pagesPerSheet?: number;
  /** 是否双面打印 */
  collate?: boolean;
  /** 份数 */
  copies?: number;
  /** 页面范围 */
  pageRanges?: { from: number; to: number }[];
  /** 双面模式 */
  duplexMode?: 'simplex' | 'shortEdge' | 'longEdge';
  /** DPI */
  dpi?: { horizontal?: number; vertical?: number };
  /** 页眉 */
  header?: string;
  /** 页脚 */
  footer?: string;
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
  /** 横向 */
  landscape?: boolean;
  /** 页面大小 */
  pageSize?:
    | 'A3'
    | 'A4'
    | 'A5'
    | 'Legal'
    | 'Letter'
    | 'Tabloid'
    | { width: number; height: number };
  /** 边距 */
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** 页面范围 */
  pageRanges?: string;
  /** 是否显示页眉页脚 */
  displayHeaderFooter?: boolean;
  /** 是否优先使用 CSS 页面大小 */
  preferCSSPageSize?: boolean;
  /** 缩放 */
  scale?: number;
}

// ============================================================================
// 剪贴板接口
// ============================================================================

/**
 * 剪贴板接口
 */
export interface IClipboard {
  /** 读取文本 */
  readText(): string;
  /** 写入文本 */
  writeText(text: string): void;
  /** 读取 HTML */
  readHTML(): string;
  /** 写入 HTML */
  writeHTML(markup: string): void;
  /** 读取图片 */
  readImage(): NativeImage | null;
  /** 写入图片 */
  writeImage(image: NativeImage): void;
  /** 读取 RTF */
  readRTF(): string;
  /** 写入 RTF */
  writeRTF(text: string): void;
  /** 读取书签 */
  readBookmark(): { title: string; url: string };
  /** 写入书签 */
  writeBookmark(title: string, url: string): void;
  /** 读取查找文本 */
  readFindText(): string;
  /** 写入查找文本 */
  writeFindText(text: string): void;
  /** 清空剪贴板 */
  clear(): void;
  /** 获取可用格式 */
  availableFormats(): string[];
  /** 是否有指定格式 */
  has(format: string): boolean;
  /** 读取指定格式 */
  read(format: string): string;
  /** 写入指定格式 */
  write(data: { text?: string; html?: string; image?: NativeImage; rtf?: string }): void;
}

// ============================================================================
// IPC 接口
// ============================================================================

/**
 * IPC 主进程接口
 */
export interface IIPCMain {
  /**
   * 监听通道消息
   */
  on(channel: string, handler: (event: IpcMainEvent, ...args: unknown[]) => void): void;

  /**
   * 单次监听通道消息
   */
  once(channel: string, handler: (event: IpcMainEvent, ...args: unknown[]) => void): void;

  /**
   * 处理异步调用
   */
  handle(
    channel: string,
    handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>
  ): void;

  /**
   * 处理单次异步调用
   */
  handleOnce(
    channel: string,
    handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>
  ): void;

  /**
   * 移除处理器
   */
  removeHandler(channel: string): void;

  /**
   * 移除所有监听器
   */
  removeAllListeners(channel?: string): void;
}

// ============================================================================
// 托盘接口
// ============================================================================

/**
 * 系统托盘接口
 */
export interface ITray {
  /** 设置图标 */
  setImage(image: string | NativeImage): void;
  /** 设置压缩图标（macOS） */
  setPressedImage(image: NativeImage): void;
  /** 设置提示 */
  setToolTip(toolTip: string): void;
  /** 设置标题（macOS） */
  setTitle(title: string): void;
  /** 获取标题 */
  getTitle(): string;
  /** 设置忽略双击事件（macOS） */
  setIgnoreDoubleClickEvents(ignore: boolean): void;
  /** 是否忽略双击事件 */
  getIgnoreDoubleClickEvents(): boolean;
  /** 显示气泡通知（Windows） */
  displayBalloon(options: { icon?: NativeImage; title: string; content: string }): void;
  /** 移除气泡通知（Windows） */
  removeBalloon(): void;
  /** 获取边界 */
  getBounds(): Rectangle;
  /** 设置上下文菜单 */
  setContextMenu(menu: IMenu | null): void;
  /** 弹出上下文菜单 */
  popUpContextMenu(menu?: IMenu, position?: { x: number; y: number }): void;
  /** 关闭上下文菜单 */
  closeContextMenu(): void;
  /** 销毁托盘 */
  destroy(): void;
  /** 是否已销毁 */
  isDestroyed(): boolean;
  /** 监听事件 */
  on(
    event: 'click' | 'right-click' | 'double-click' | 'balloon-show' | 'balloon-click' | 'balloon-closed' | 'drop' | 'drop-files' | 'drop-text' | 'drag-enter' | 'drag-leave' | 'drag-end' | 'mouse-enter' | 'mouse-leave' | 'mouse-move',
    handler: (...args: unknown[]) => void
  ): void;
}

// ============================================================================
// 菜单接口
// ============================================================================

/**
 * 菜单接口
 */
export interface IMenu {
  /** 菜单项列表 */
  items: IMenuItem[];
  /** 弹出菜单 */
  popup(options?: { window?: IBrowserWindow; x?: number; y?: number }): void;
  /** 关闭弹出菜单 */
  closePopup(window?: IBrowserWindow): void;
  /** 追加菜单项 */
  append(menuItem: IMenuItem): void;
  /** 获取指定索引的菜单项 */
  getMenuItemById(id: string): IMenuItem | null;
  /** 在指定位置插入菜单项 */
  insert(pos: number, menuItem: IMenuItem): void;
}

/**
 * 菜单项配置
 */
export interface MenuItemConfig {
  /** 点击回调 */
  click?: (menuItem: IMenuItem, window: IBrowserWindow | undefined, event: unknown) => void;
  /** 角色 */
  role?: MenuItemRole;
  /** 类型 */
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  /** 标签 */
  label?: string;
  /** 子标签 */
  sublabel?: string;
  /** 工具提示 */
  toolTip?: string;
  /** 快捷键 */
  accelerator?: string;
  /** 图标 */
  icon?: string | NativeImage;
  /** 是否启用 */
  enabled?: boolean;
  /** 加速器是否在标签中可见 */
  acceleratorWorksWhenHidden?: boolean;
  /** 是否可见 */
  visible?: boolean;
  /** 是否选中（checkbox/radio） */
  checked?: boolean;
  /** 是否注册加速器 */
  registerAccelerator?: boolean;
  /** 共享菜单动作（macOS） */
  sharingItem?: { filePath?: string; texts?: string[] };
  /** 子菜单 */
  submenu?: IMenu | MenuItemConfig[];
  /** ID */
  id?: string;
  /** 在之前 */
  before?: string[];
  /** 在之后 */
  after?: string[];
  /** 在组开始之前 */
  beforeGroupContaining?: string[];
  /** 在组结束之后 */
  afterGroupContaining?: string[];
}

/**
 * 菜单项角色
 */
export type MenuItemRole =
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'pasteAndMatchStyle'
  | 'delete'
  | 'selectAll'
  | 'reload'
  | 'forceReload'
  | 'toggleDevTools'
  | 'resetZoom'
  | 'zoomIn'
  | 'zoomOut'
  | 'togglefullscreen'
  | 'window'
  | 'minimize'
  | 'close'
  | 'help'
  | 'about'
  | 'services'
  | 'hide'
  | 'hideOthers'
  | 'unhide'
  | 'quit'
  | 'startSpeaking'
  | 'stopSpeaking'
  | 'appMenu'
  | 'fileMenu'
  | 'editMenu'
  | 'viewMenu'
  | 'windowMenu'
  | 'shareMenu'
  | 'recentDocuments'
  | 'toggleTabBar'
  | 'selectNextTab'
  | 'selectPreviousTab'
  | 'mergeAllWindows'
  | 'moveTabToNewWindow'
  | 'clearRecentDocuments'
  | 'front'
  | 'zoom';

/**
 * 菜单项接口
 */
export interface IMenuItem {
  /** ID */
  id: string;
  /** 标签 */
  label: string;
  /** 子标签 */
  sublabel: string;
  /** 工具提示 */
  toolTip: string;
  /** 快捷键 */
  accelerator: string | undefined;
  /** 图标 */
  icon: NativeImage | string | undefined;
  /** 是否启用 */
  enabled: boolean;
  /** 是否可见 */
  visible: boolean;
  /** 是否选中 */
  checked: boolean;
  /** 类型 */
  type: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  /** 角色 */
  role: MenuItemRole | undefined;
  /** 子菜单 */
  submenu: IMenu | undefined;
  /** 命令 ID */
  commandId: number;
  /** 菜单 */
  menu: IMenu;
  /** 点击处理 */
  click: () => void;
}

// ============================================================================
// 协议处理器类型
// ============================================================================

/**
 * 协议处理器
 */
export type ProtocolHandler = (
  request: { url: string; headers: Record<string, string>; method: string }
) => Promise<{ mimeType: string; data: Buffer }> | { mimeType: string; data: Buffer };

// ============================================================================
// Shell 相关类型
// ============================================================================

/**
 * Shell 打开选项
 */
export interface ShellOpenOptions {
  /** 激活应用 */
  activate?: boolean;
  /** 工作目录 */
  workingDirectory?: string;
}

// ============================================================================
// Electron Framework 完整接口
// ============================================================================

/**
 * Electron Framework 完整接口
 */
export interface IElectronFramework {
  // ========== 环境检测 ==========
  /** 是否可用 */
  isAvailable(): boolean;
  /** 是否在主进程 */
  isMain(): boolean;
  /** 是否在渲染进程 */
  isRenderer(): boolean;

  // ========== 应用生命周期 ==========
  /** 是否就绪 */
  isReady(): boolean;
  /** 等待就绪 */
  whenReady(): Promise<void>;
  /** 退出应用 */
  quit(): void;
  /** 重新启动 */
  relaunch(options?: { args?: string[]; execPath?: string }): void;
  /** 获取应用名称 */
  getName(): string;
  /** 获取应用版本 */
  getVersion(): string;

  // ========== 窗口管理 ==========
  /** 创建窗口 */
  createWindow(config: WindowConfig): Promise<IBrowserWindow>;
  /** 获取窗口 */
  getWindow(windowId: number): IBrowserWindow | null;
  /** 获取所有窗口 */
  getAllWindows(): IBrowserWindow[];
  /** 获取聚焦的窗口 */
  getFocusedWindow(): IBrowserWindow | null;

  // ========== 系统路径 ==========
  /** 获取系统路径 */
  getPath(name: PathName): string;
  /** 设置系统路径 */
  setPath(name: PathName, path: string): void;
  /** 获取应用路径 */
  getAppPath(): string;
  /** 获取用户数据路径 */
  getUserDataPath(): string;
  /** 获取桌面路径 */
  getDesktopPath(): string;
  /** 获取文档路径 */
  getDocumentsPath(): string;
  /** 获取下载路径 */
  getDownloadsPath(): string;
  /** 获取临时目录路径 */
  getTempPath(): string;

  // ========== 对话框 ==========
  /** 显示打开对话框 */
  showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult>;
  /** 显示保存对话框 */
  showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult>;
  /** 显示消息框 */
  showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult>;

  // ========== 剪贴板 ==========
  /** 剪贴板 */
  clipboard: IClipboard;

  // ========== 系统托盘 ==========
  /** 创建系统托盘 */
  createTray(iconPath: string): ITray;

  // ========== 应用菜单 ==========
  /** 设置应用菜单 */
  setApplicationMenu(menu: IMenu | null): void;
  /** 获取应用菜单 */
  getApplicationMenu(): IMenu | null;
  /** 创建菜单 */
  createMenu(template?: MenuItemConfig[]): IMenu;
  /** 创建菜单项 */
  createMenuItem(options: MenuItemConfig): IMenuItem;

  // ========== 协议处理 ==========
  /** 注册协议 */
  registerProtocol(scheme: string, handler: ProtocolHandler): void;
  /** 注销协议 */
  unregisterProtocol(scheme: string): void;

  // ========== IPC通信 ==========
  /** IPC 主进程 */
  ipcMain: IIPCMain;

  // ========== Shell操作 ==========
  /** 在文件管理器中显示 */
  showItemInFolder(path: string): void;
  /** 打开路径 */
  openPath(path: string): Promise<string>;
  /** 打开外部链接 */
  openExternal(url: string, options?: ShellOpenOptions): Promise<void>;
  /** 移动到回收站 */
  trashItem(path: string): Promise<void>;
  /** 发出系统提示音 */
  beep(): void;

  // ========== 系统信息 ==========
  /** 获取系统信息 */
  getSystemInfo(): SystemInfo;
  /** 获取屏幕信息 */
  getScreenInfo(): ScreenInfo;
  /** 获取主显示器 */
  getPrimaryDisplay(): Display;
  /** 获取所有显示器 */
  getAllDisplays(): Display[];

  // ========== 通知 ==========
  /** 显示通知 */
  showNotification(title: string, body: string, options?: NotificationOptions): void;
  /** 是否支持通知 */
  isNotificationSupported(): boolean;
}
