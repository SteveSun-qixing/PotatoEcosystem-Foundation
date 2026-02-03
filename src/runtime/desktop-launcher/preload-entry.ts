/**
 * Electron 预加载脚本入口模板
 * @module @chips/foundation/runtime/desktop-launcher/preload-entry
 *
 * 提供 Electron 预加载脚本的入口模板
 * 上层应用可以直接使用此入口，或参考此模板创建自定义预加载脚本
 */

import { contextBridge, ipcRenderer } from 'electron';
import { DesktopIPCChannels } from './ipc-bridge';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 对话框选项
 */
interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: ('openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles')[];
  message?: string;
}

interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: { name: string; extensions: string[] }[];
  message?: string;
}

interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
  title?: string;
  message: string;
  detail?: string;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
}

// ============================================================================
// 预加载 API
// ============================================================================

/**
 * 暴露给渲染进程的 API
 */
const desktopAPI = {
  // ========== 应用控制 ==========
  app: {
    /** 退出应用 */
    quit: () => ipcRenderer.invoke(DesktopIPCChannels.APP_QUIT),
    /** 重启应用 */
    relaunch: () => ipcRenderer.invoke(DesktopIPCChannels.APP_RELAUNCH),
    /** 获取应用信息 */
    getInfo: () => ipcRenderer.invoke(DesktopIPCChannels.APP_GET_INFO),
    /** 获取路径 */
    getPath: (name: string) => ipcRenderer.invoke(DesktopIPCChannels.APP_GET_PATH, name),
  },

  // ========== 窗口控制 ==========
  window: {
    /** 最小化窗口 */
    minimize: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_MINIMIZE),
    /** 最大化窗口 */
    maximize: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_MAXIMIZE),
    /** 取消最大化 */
    unmaximize: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_UNMAXIMIZE),
    /** 关闭窗口 */
    close: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_CLOSE),
    /** 还原窗口 */
    restore: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_RESTORE),
    /** 设置标题 */
    setTitle: (title: string) => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_SET_TITLE, title),
    /** 设置大小 */
    setSize: (width: number, height: number) =>
      ipcRenderer.invoke(DesktopIPCChannels.WINDOW_SET_SIZE, width, height),
    /** 设置位置 */
    setPosition: (x: number, y: number) =>
      ipcRenderer.invoke(DesktopIPCChannels.WINDOW_SET_POSITION, x, y),
    /** 居中窗口 */
    center: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_CENTER),
    /** 设置全屏 */
    setFullscreen: (flag: boolean) =>
      ipcRenderer.invoke(DesktopIPCChannels.WINDOW_SET_FULLSCREEN, flag),
    /** 是否最大化 */
    isMaximized: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_IS_MAXIMIZED),
    /** 是否最小化 */
    isMinimized: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_IS_MINIMIZED),
    /** 是否全屏 */
    isFullscreen: () => ipcRenderer.invoke(DesktopIPCChannels.WINDOW_IS_FULLSCREEN),
  },

  // ========== 对话框 ==========
  dialog: {
    /** 打开文件对话框 */
    openFile: (options?: OpenDialogOptions) =>
      ipcRenderer.invoke(DesktopIPCChannels.DIALOG_OPEN_FILE, options),
    /** 打开文件夹对话框 */
    openDirectory: (options?: OpenDialogOptions) =>
      ipcRenderer.invoke(DesktopIPCChannels.DIALOG_OPEN_DIRECTORY, options),
    /** 保存文件对话框 */
    saveFile: (options?: SaveDialogOptions) =>
      ipcRenderer.invoke(DesktopIPCChannels.DIALOG_SAVE_FILE, options),
    /** 消息框 */
    messageBox: (options: MessageBoxOptions) =>
      ipcRenderer.invoke(DesktopIPCChannels.DIALOG_MESSAGE_BOX, options),
  },

  // ========== Shell 操作 ==========
  shell: {
    /** 打开外部链接 */
    openExternal: (url: string) => ipcRenderer.invoke(DesktopIPCChannels.SHELL_OPEN_EXTERNAL, url),
    /** 打开路径 */
    openPath: (path: string) => ipcRenderer.invoke(DesktopIPCChannels.SHELL_OPEN_PATH, path),
    /** 在文件管理器中显示 */
    showItemInFolder: (path: string) =>
      ipcRenderer.invoke(DesktopIPCChannels.SHELL_SHOW_ITEM_IN_FOLDER, path),
    /** 移到回收站 */
    trashItem: (path: string) => ipcRenderer.invoke(DesktopIPCChannels.SHELL_TRASH_ITEM, path),
    /** 系统提示音 */
    beep: () => ipcRenderer.invoke(DesktopIPCChannels.SHELL_BEEP),
  },

  // ========== 剪贴板 ==========
  clipboard: {
    /** 读取文本 */
    readText: () => ipcRenderer.invoke(DesktopIPCChannels.CLIPBOARD_READ_TEXT),
    /** 写入文本 */
    writeText: (text: string) =>
      ipcRenderer.invoke(DesktopIPCChannels.CLIPBOARD_WRITE_TEXT, text),
    /** 读取 HTML */
    readHTML: () => ipcRenderer.invoke(DesktopIPCChannels.CLIPBOARD_READ_HTML),
    /** 写入 HTML */
    writeHTML: (markup: string) =>
      ipcRenderer.invoke(DesktopIPCChannels.CLIPBOARD_WRITE_HTML, markup),
    /** 清空剪贴板 */
    clear: () => ipcRenderer.invoke(DesktopIPCChannels.CLIPBOARD_CLEAR),
  },

  // ========== 系统信息 ==========
  system: {
    /** 获取系统信息 */
    getInfo: () => ipcRenderer.invoke(DesktopIPCChannels.SYSTEM_GET_INFO),
    /** 获取屏幕信息 */
    getScreenInfo: () => ipcRenderer.invoke(DesktopIPCChannels.SYSTEM_GET_SCREEN_INFO),
  },

  // ========== 主题 ==========
  theme: {
    /** 获取原生主题 */
    getNative: () => ipcRenderer.invoke(DesktopIPCChannels.THEME_GET_NATIVE),
    /** 是否应使用深色模式 */
    shouldUseDark: () => ipcRenderer.invoke(DesktopIPCChannels.THEME_SHOULD_USE_DARK),
  },

  // ========== IPC 通信 ==========
  ipc: {
    /** 发送消息 */
    send: (channel: string, ...args: unknown[]) => {
      ipcRenderer.send(channel, ...args);
    },
    /** 调用并等待响应 */
    invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> => {
      return ipcRenderer.invoke(channel, ...args);
    },
    /** 监听消息 */
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
        callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    /** 单次监听 */
    once: (channel: string, callback: (...args: unknown[]) => void) => {
      ipcRenderer.once(channel, (_event, ...args) => callback(...args));
    },
  },

  // ========== 平台信息 ==========
  platform: {
    /** 操作系统平台 */
    os: process.platform,
    /** 是否 macOS */
    isMac: process.platform === 'darwin',
    /** 是否 Windows */
    isWindows: process.platform === 'win32',
    /** 是否 Linux */
    isLinux: process.platform === 'linux',
    /** Node.js 版本 */
    nodeVersion: process.versions.node,
    /** Electron 版本 */
    electronVersion: process.versions.electron,
    /** Chrome 版本 */
    chromeVersion: process.versions.chrome,
  },
};

// ============================================================================
// 暴露 API 到渲染进程
// ============================================================================

// 暴露到 window.desktopAPI
contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);

// 为了兼容性，也暴露到 window.electronAPI（与 FileConnector 保持一致）
contextBridge.exposeInMainWorld('electronAPI', desktopAPI);

// ============================================================================
// 类型声明
// ============================================================================

// 声明全局类型，供渲染进程使用
declare global {
  interface Window {
    desktopAPI: typeof desktopAPI;
    electronAPI: typeof desktopAPI;
  }
}

// ============================================================================
// 导出类型
// ============================================================================

export type { OpenDialogOptions, SaveDialogOptions, MessageBoxOptions };
export { desktopAPI };
