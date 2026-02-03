/**
 * DesktopLauncher 模块导出
 * @module @chips/foundation/runtime/desktop-launcher
 *
 * 提供桌面启动器功能的完整导出
 * 为上层应用提供统一的桌面启动入口
 */

// ============================================================================
// 类型导出
// ============================================================================

export type {
  // 窗口配置
  WindowConfig,
  TitleBarOverlayConfig,
  // 菜单配置
  MenuConfig,
  MenuItemConfig,
  MenuRole,
  MenuItemRole,
  // 托盘配置
  TrayConfig,
  // 应用配置
  DesktopAppConfig,
  // IPC 配置
  IpcHandlerConfig,
  PreloadAPIConfig,
  // 事件类型
  LauncherEventType,
  LauncherEventHandler,
  // 接口
  IDesktopLauncher,
} from './types';

// ============================================================================
// 主启动器导出
// ============================================================================

export { DesktopLauncher, launchDesktopApp } from './desktop-launcher';

// ============================================================================
// IPC 桥接导出
// ============================================================================

export {
  IPCBridge,
  ipcBridge,
  DesktopIPCChannels,
} from './ipc-bridge';
export type { DesktopIPCChannel } from './ipc-bridge';

// ============================================================================
// 主进程入口导出
// ============================================================================

export {
  createDefaultConfig,
  startApp,
  getLauncher,
  stopApp,
} from './main-entry';

// ============================================================================
// 预加载脚本导出
// ============================================================================

// 预加载脚本需要单独打包，这里只导出类型
export type {
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions,
} from './preload-entry';

// ============================================================================
// 辅助函数导出
// ============================================================================

export { toElectronWindowConfig } from './types';
