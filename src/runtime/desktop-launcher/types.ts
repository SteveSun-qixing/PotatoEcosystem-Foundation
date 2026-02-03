/**
 * DesktopLauncher 类型定义
 * @module @chips/foundation/runtime/desktop-launcher/types
 *
 * 提供桌面启动器的完整类型定义
 */

import type { IBrowserWindow, WindowConfig as ElectronWindowConfig, IpcHandler } from '../electron-framework/types';

// ============================================================================
// 窗口配置
// ============================================================================

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
  /** 是否居中 */
  center?: boolean;
  /** 标题 */
  title?: string;
  /** 是否显示框架 */
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
  /** 是否在任务栏显示 */
  skipTaskbar?: boolean;
  /** 是否始终置顶 */
  alwaysOnTop?: boolean;
  /** 是否可聚焦 */
  focusable?: boolean;
  /** 是否启用深色模式 */
  darkTheme?: boolean;
  /** 标题栏样式 */
  titleBarStyle?: 'default' | 'hidden' | 'hiddenInset' | 'customButtonsOnHover';
  /** 是否显示标题栏覆盖层（Windows） */
  titleBarOverlay?: boolean | TitleBarOverlayConfig;
  /** 交通灯按钮位置（macOS） */
  trafficLightPosition?: { x: number; y: number };
  /** 振动效果（macOS） */
  vibrancy?: string;
  /** 窗口图标 */
  icon?: string;
}

/**
 * 标题栏覆盖层配置
 */
export interface TitleBarOverlayConfig {
  /** 颜色 */
  color?: string;
  /** 符号颜色 */
  symbolColor?: string;
  /** 高度 */
  height?: number;
}

// ============================================================================
// 菜单配置
// ============================================================================

/**
 * 菜单配置
 */
export interface MenuConfig {
  /** 菜单 ID */
  id?: string;
  /** 标签 */
  label: string;
  /** 子菜单 */
  submenu?: MenuItemConfig[];
  /** 角色 */
  role?: MenuRole;
}

/**
 * 菜单项配置
 */
export interface MenuItemConfig {
  /** 菜单项 ID */
  id?: string;
  /** 标签 */
  label?: string;
  /** 快捷键 */
  accelerator?: string;
  /** 角色 */
  role?: MenuItemRole;
  /** 类型 */
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  /** 是否启用 */
  enabled?: boolean;
  /** 是否可见 */
  visible?: boolean;
  /** 是否选中（checkbox/radio） */
  checked?: boolean;
  /** 子菜单 */
  submenu?: MenuItemConfig[];
  /** 点击回调 */
  click?: () => void;
}

/**
 * 菜单角色
 */
export type MenuRole = 'appMenu' | 'fileMenu' | 'editMenu' | 'viewMenu' | 'windowMenu' | 'help';

/**
 * 菜单项角色
 */
export type MenuItemRole =
  | 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'pasteAndMatchStyle'
  | 'delete' | 'selectAll' | 'reload' | 'forceReload' | 'toggleDevTools'
  | 'resetZoom' | 'zoomIn' | 'zoomOut' | 'togglefullscreen'
  | 'window' | 'minimize' | 'close' | 'help' | 'about'
  | 'services' | 'hide' | 'hideOthers' | 'unhide' | 'quit'
  | 'startSpeaking' | 'stopSpeaking' | 'front' | 'zoom';

// ============================================================================
// 托盘配置
// ============================================================================

/**
 * 托盘配置
 */
export interface TrayConfig {
  /** 图标路径 */
  icon: string;
  /** 提示文字 */
  tooltip?: string;
  /** 菜单 */
  menu?: MenuItemConfig[];
  /** 点击回调 */
  onClick?: () => void;
  /** 双击回调 */
  onDoubleClick?: () => void;
  /** 右键点击回调 */
  onRightClick?: () => void;
}

// ============================================================================
// 桌面应用配置
// ============================================================================

/**
 * 桌面应用配置
 */
export interface DesktopAppConfig {
  /** 应用 ID */
  appId: string;
  /** 应用名称 */
  name: string;
  /** 应用版本 */
  version: string;
  /** 窗口配置 */
  window: WindowConfig;
  /** 渲染进程入口 */
  rendererEntry?: string;
  /** 是否开发模式 */
  isDev?: boolean;
  /** 开发服务器 URL（开发模式使用） */
  devServerUrl?: string;
  /** 生产环境 HTML 文件路径 */
  productionHtml?: string;
  /** 是否单例模式 */
  singleInstance?: boolean;
  /** 应用图标 */
  icon?: string;
  /** 应用菜单配置 */
  menu?: MenuConfig[];
  /** 系统托盘配置 */
  tray?: TrayConfig;
  /** 预加载脚本路径 */
  preload?: string;
  /** 是否禁用硬件加速 */
  disableHardwareAcceleration?: boolean;
  /** 是否在后台运行（关闭窗口不退出） */
  runInBackground?: boolean;
  /** 自定义协议 */
  protocol?: string;
  /** 用户数据目录 */
  userDataPath?: string;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// IPC 类型
// ============================================================================

/**
 * IPC 处理器配置
 */
export interface IpcHandlerConfig {
  /** 通道名称 */
  channel: string;
  /** 处理器函数 */
  handler: IpcHandler;
}

/**
 * 预加载 API 配置
 */
export interface PreloadAPIConfig {
  /** API 命名空间 */
  namespace: string;
  /** 暴露的方法 */
  methods: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
}

// ============================================================================
// 启动器事件
// ============================================================================

/**
 * 启动器事件类型
 */
export type LauncherEventType =
  | 'ready'
  | 'window-created'
  | 'window-closed'
  | 'window-all-closed'
  | 'activate'
  | 'before-quit'
  | 'will-quit'
  | 'quit'
  | 'second-instance';

/**
 * 启动器事件处理器
 */
export type LauncherEventHandler = (...args: unknown[]) => void;

// ============================================================================
// 启动器接口
// ============================================================================

/**
 * 桌面启动器接口
 */
export interface IDesktopLauncher {
  // ========== 生命周期 ==========
  /**
   * 启动应用
   */
  launch(): Promise<void>;

  /**
   * 退出应用
   */
  quit(): void;

  /**
   * 重启应用
   */
  relaunch(): void;

  // ========== 窗口管理 ==========
  /**
   * 获取主窗口
   */
  getMainWindow(): IBrowserWindow | null;

  /**
   * 创建新窗口
   */
  createWindow(config: WindowConfig): Promise<IBrowserWindow>;

  /**
   * 获取窗口
   */
  getWindow(windowId: number): IBrowserWindow | null;

  /**
   * 获取所有窗口
   */
  getAllWindows(): IBrowserWindow[];

  // ========== IPC 通信 ==========
  /**
   * 注册 IPC 处理器
   */
  registerIpcHandler(channel: string, handler: IpcHandler): void;

  /**
   * 移除 IPC 处理器
   */
  removeIpcHandler(channel: string): void;

  /**
   * 发送消息到渲染进程
   */
  sendToRenderer(channel: string, ...args: unknown[]): void;

  /**
   * 发送消息到指定窗口
   */
  sendToWindow(windowId: number, channel: string, ...args: unknown[]): void;

  // ========== 事件 ==========
  /**
   * 监听事件
   */
  on(event: LauncherEventType, handler: LauncherEventHandler): () => void;

  /**
   * 单次监听事件
   */
  once(event: LauncherEventType, handler: LauncherEventHandler): void;

  // ========== 状态 ==========
  /**
   * 是否就绪
   */
  isReady(): boolean;

  /**
   * 获取配置
   */
  getConfig(): DesktopAppConfig;
}

// ============================================================================
// 辅助类型
// ============================================================================

/**
 * 转换 WindowConfig 到 ElectronWindowConfig
 */
export function toElectronWindowConfig(config: WindowConfig, preload?: string): ElectronWindowConfig {
  return {
    width: config.width,
    height: config.height,
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    maxWidth: config.maxWidth,
    maxHeight: config.maxHeight,
    x: config.x,
    y: config.y,
    center: config.center,
    title: config.title,
    frame: config.frame,
    transparent: config.transparent,
    resizable: config.resizable,
    fullscreen: config.fullscreen,
    fullscreenable: config.fullscreenable,
    autoHideMenuBar: config.autoHideMenuBar,
    backgroundColor: config.backgroundColor,
    show: config.show,
    icon: config.icon,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  };
}
