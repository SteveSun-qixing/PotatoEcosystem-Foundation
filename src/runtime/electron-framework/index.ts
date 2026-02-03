/**
 * ElectronFramework 模块导出
 * @module @chips/foundation/runtime/electron-framework
 *
 * 提供 Electron 框架封装的完整导出
 */

// 类型导出
export type {
  // 窗口相关类型
  Rectangle,
  WindowConfig,
  WebPreferencesConfig,
  WindowEvent,
  // 对话框相关类型
  FileFilter,
  OpenDialogOptions,
  OpenDialogResult,
  SaveDialogOptions,
  SaveDialogResult,
  MessageBoxOptions,
  MessageBoxResult,
  // 路径相关类型
  PathName,
  // IPC 相关类型
  IpcMainEvent,
  IpcMainInvokeEvent,
  IpcHandler,
  // 系统信息类型
  SystemInfo,
  ScreenInfo,
  Display,
  // 通知类型
  NotificationOptions,
  // 原生图片类型
  NativeImage,
  // 窗口接口
  IBrowserWindow,
  IWebContents,
  PrintOptions,
  PrintToPDFOptions,
  // 剪贴板接口
  IClipboard,
  // IPC 接口
  IIPCMain,
  // 托盘接口
  ITray,
  // 菜单接口
  IMenu,
  IMenuItem,
  MenuItemConfig,
  MenuItemRole,
  // 协议处理器类型
  ProtocolHandler,
  // Shell 类型
  ShellOpenOptions,
  // 主接口
  IElectronFramework,
} from './types';

// 主框架导出
export { ElectronFramework, electronFramework } from './electron-framework';

// 窗口管理导出
export {
  BrowserWindowWrapper,
  WebContentsWrapper,
  WindowManager,
  windowManager,
} from './browser-window';

// 对话框导出
export {
  DialogManager,
  dialogManager,
  showOpenDialog,
  showSaveDialog,
  showMessageBox,
  showInfo,
  showWarning,
  showError,
  showConfirm,
  showQuestion,
} from './dialog';

// 剪贴板导出
export {
  ClipboardManager,
  clipboardManager,
  copyText,
  pasteText,
  copyHTML,
  pasteHTML,
  pasteImage,
  copyImage,
  clearClipboard,
  hasText,
  hasHTML,
  hasImage,
} from './clipboard';

// IPC 导出
export {
  IPCMainManager,
  ipcMainManager,
  registerIPCHandlers,
  unregisterIPCHandlers,
  IPCChannels,
} from './ipc-main';
export type { IPCHandlerConfig, IPCChannel } from './ipc-main';
