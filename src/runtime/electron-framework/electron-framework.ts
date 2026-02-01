/**
 * ElectronFramework Electron框架抽象
 * @module @chips/foundation/runtime/electron-framework/electron-framework
 *
 * 提供 Electron 原生能力的抽象接口
 */

/**
 * 窗口创建选项
 */
export interface BrowserWindowOptions {
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** X坐标 */
  x?: number;
  /** Y坐标 */
  y?: number;
  /** 标题 */
  title?: string;
  /** 是否显示框架 */
  frame?: boolean;
  /** 是否透明 */
  transparent?: boolean;
  /** 是否可调整大小 */
  resizable?: boolean;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
}

/**
 * 对话框选项
 */
export interface DialogOptions {
  /** 标题 */
  title?: string;
  /** 默认路径 */
  defaultPath?: string;
  /** 过滤器 */
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  /** 属性 */
  properties?: string[];
}

/**
 * ElectronFramework Electron框架抽象
 */
export class ElectronFramework {
  /**
   * 检查是否在 Electron 环境
   */
  isAvailable(): boolean {
    return typeof process !== 'undefined' && 'electron' in (process.versions ?? {});
  }

  /**
   * 获取应用路径
   */
  getAppPath(): string {
    if (!this.isAvailable()) {
      return '';
    }
    // 在实际 Electron 环境中应该使用 app.getAppPath()
    return process.cwd();
  }

  /**
   * 获取用户数据路径
   */
  getUserDataPath(): string {
    if (!this.isAvailable()) {
      return '';
    }
    // 在实际 Electron 环境中应该使用 app.getPath('userData')
    return '';
  }

  /**
   * 获取桌面路径
   */
  getDesktopPath(): string {
    if (!this.isAvailable()) {
      return '';
    }
    // 在实际 Electron 环境中应该使用 app.getPath('desktop')
    return '';
  }

  /**
   * 获取文档路径
   */
  getDocumentsPath(): string {
    if (!this.isAvailable()) {
      return '';
    }
    // 在实际 Electron 环境中应该使用 app.getPath('documents')
    return '';
  }

  /**
   * 复制到剪贴板
   */
  copyToClipboard(text: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  }

  /**
   * 从剪贴板读取
   */
  async readFromClipboard(): Promise<string> {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      return navigator.clipboard.readText();
    }
    return '';
  }

  /**
   * 在默认浏览器中打开链接
   */
  openExternal(url: string): void {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  }

  /**
   * 显示通知
   */
  showNotification(title: string, body: string): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (typeof Notification !== 'undefined') {
      void Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  }

  /**
   * 获取系统信息
   */
  getSystemInfo(): {
    platform: string;
    arch: string;
    version: string;
  } {
    return {
      platform: typeof process !== 'undefined' ? process.platform : 'browser',
      arch: typeof process !== 'undefined' ? process.arch : 'unknown',
      version: typeof process !== 'undefined' ? (process.versions?.['electron'] ?? 'unknown') : 'browser',
    };
  }

  /**
   * 获取屏幕信息
   */
  getScreenInfo(): {
    width: number;
    height: number;
    scaleFactor: number;
  } {
    if (typeof window !== 'undefined') {
      return {
        width: window.screen.width,
        height: window.screen.height,
        scaleFactor: window.devicePixelRatio,
      };
    }
    return { width: 0, height: 0, scaleFactor: 1 };
  }
}

/**
 * 全局 Electron 框架实例
 */
export const electronFramework = new ElectronFramework();
