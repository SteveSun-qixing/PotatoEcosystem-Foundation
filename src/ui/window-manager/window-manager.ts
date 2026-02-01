/**
 * WindowManager 窗口管理器
 * @module @chips/foundation/ui/window-manager/window-manager
 */

import { generateId } from '../../core/utils/id-generator';

/**
 * 窗口状态
 */
export type WindowState = 'normal' | 'minimized' | 'maximized' | 'fullscreen';

/**
 * 窗口配置
 */
export interface WindowConfig {
  /** 标题 */
  title: string;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** X坐标 */
  x?: number;
  /** Y坐标 */
  y?: number;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 是否可移动 */
  movable?: boolean;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 是否模态 */
  modal?: boolean;
}

/**
 * 窗口信息
 */
export interface WindowInfo {
  /** 窗口ID */
  id: string;
  /** 配置 */
  config: WindowConfig;
  /** 状态 */
  state: WindowState;
  /** 是否聚焦 */
  focused: boolean;
  /** Z层级 */
  zIndex: number;
}

/**
 * WindowManager 窗口管理器
 */
export class WindowManager {
  private windows: Map<string, WindowInfo> = new Map();
  private nextZIndex: number = 100;
  private focusedWindowId: string | null = null;

  /**
   * 创建窗口
   */
  createWindow(config: WindowConfig): string {
    const id = generateId();

    const windowInfo: WindowInfo = {
      id,
      config: {
        width: 800,
        height: 600,
        resizable: true,
        movable: true,
        minWidth: 200,
        minHeight: 150,
        modal: false,
        ...config,
      },
      state: 'normal',
      focused: false,
      zIndex: this.nextZIndex++,
    };

    this.windows.set(id, windowInfo);
    this.focusWindow(id);

    return id;
  }

  /**
   * 关闭窗口
   */
  closeWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) {
      return false;
    }

    this.windows.delete(id);

    if (this.focusedWindowId === id) {
      this.focusedWindowId = null;
      // 聚焦最上层窗口
      const topWindow = this.getTopWindow();
      if (topWindow) {
        this.focusWindow(topWindow.id);
      }
    }

    return true;
  }

  /**
   * 聚焦窗口
   */
  focusWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) {
      return false;
    }

    // 取消当前聚焦
    if (this.focusedWindowId && this.focusedWindowId !== id) {
      const current = this.windows.get(this.focusedWindowId);
      if (current) {
        current.focused = false;
      }
    }

    // 设置新聚焦
    window.focused = true;
    window.zIndex = this.nextZIndex++;
    this.focusedWindowId = id;

    return true;
  }

  /**
   * 最小化窗口
   */
  minimizeWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) {
      return false;
    }
    window.state = 'minimized';
    return true;
  }

  /**
   * 最大化窗口
   */
  maximizeWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) {
      return false;
    }
    window.state = window.state === 'maximized' ? 'normal' : 'maximized';
    return true;
  }

  /**
   * 恢复窗口
   */
  restoreWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) {
      return false;
    }
    window.state = 'normal';
    return true;
  }

  /**
   * 获取窗口
   */
  getWindow(id: string): WindowInfo | undefined {
    return this.windows.get(id);
  }

  /**
   * 获取所有窗口
   */
  getAllWindows(): WindowInfo[] {
    return Array.from(this.windows.values());
  }

  /**
   * 获取聚焦窗口
   */
  getFocusedWindow(): WindowInfo | undefined {
    return this.focusedWindowId ? this.windows.get(this.focusedWindowId) : undefined;
  }

  /**
   * 获取最上层窗口
   */
  private getTopWindow(): WindowInfo | undefined {
    let topWindow: WindowInfo | undefined;
    for (const window of this.windows.values()) {
      if (!topWindow || window.zIndex > topWindow.zIndex) {
        topWindow = window;
      }
    }
    return topWindow;
  }

  /**
   * 移动窗口
   */
  moveWindow(id: string, x: number, y: number): boolean {
    const window = this.windows.get(id);
    if (!window || !window.config.movable) {
      return false;
    }
    window.config.x = x;
    window.config.y = y;
    return true;
  }

  /**
   * 调整窗口大小
   */
  resizeWindow(id: string, width: number, height: number): boolean {
    const window = this.windows.get(id);
    if (!window || !window.config.resizable) {
      return false;
    }

    const minWidth = window.config.minWidth ?? 0;
    const minHeight = window.config.minHeight ?? 0;

    window.config.width = Math.max(width, minWidth);
    window.config.height = Math.max(height, minHeight);
    return true;
  }
}

/**
 * 全局窗口管理器实例
 */
export const windowManager = new WindowManager();
