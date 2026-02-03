/**
 * Dialog 对话框封装
 * @module @chips/foundation/runtime/electron-framework/dialog
 *
 * 提供 Electron 原生对话框的封装
 */

import type {
  OpenDialogOptions,
  OpenDialogResult,
  SaveDialogOptions,
  SaveDialogResult,
  MessageBoxOptions,
  MessageBoxResult,
  IBrowserWindow,
} from './types';
import type { BrowserWindowWrapper } from './browser-window';

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

/**
 * 获取原始 BrowserWindow
 */
function getRawWindow(window?: IBrowserWindow): Electron.BrowserWindow | undefined {
  if (!window) {
    return undefined;
  }
  return (window as BrowserWindowWrapper).raw ?? undefined;
}

// ============================================================================
// 对话框管理器
// ============================================================================

/**
 * 对话框管理器
 * 提供原生对话框的封装
 */
export class DialogManager {
  /**
   * 显示打开文件对话框
   * @param options 对话框选项
   * @param parentWindow 父窗口（可选）
   * @returns 对话框结果
   */
  async showOpenDialog(
    options: OpenDialogOptions,
    parentWindow?: IBrowserWindow
  ): Promise<OpenDialogResult> {
    const electron = getElectron();
    if (!electron) {
      // 浏览器环境的降级处理：使用 input 元素
      return this.showBrowserOpenDialog(options);
    }

    const { dialog } = electron;
    const rawWindow = getRawWindow(parentWindow);

    // 转换选项
    const dialogOptions: Electron.OpenDialogOptions = {
      title: options.title,
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel,
      filters: options.filters,
      properties: options.properties as Electron.OpenDialogOptions['properties'],
      message: options.message,
      securityScopedBookmarks: options.securityScopedBookmarks,
    };

    // 调用对话框
    if (rawWindow) {
      return dialog.showOpenDialog(rawWindow, dialogOptions);
    }
    return dialog.showOpenDialog(dialogOptions);
  }

  /**
   * 显示保存文件对话框
   * @param options 对话框选项
   * @param parentWindow 父窗口（可选）
   * @returns 对话框结果
   */
  async showSaveDialog(
    options: SaveDialogOptions,
    parentWindow?: IBrowserWindow
  ): Promise<SaveDialogResult> {
    const electron = getElectron();
    if (!electron) {
      // 浏览器环境的降级处理：使用下载链接
      return this.showBrowserSaveDialog(options);
    }

    const { dialog } = electron;
    const rawWindow = getRawWindow(parentWindow);

    // 转换选项
    const dialogOptions: Electron.SaveDialogOptions = {
      title: options.title,
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel,
      filters: options.filters,
      message: options.message,
      nameFieldLabel: options.nameFieldLabel,
      showsTagField: options.showsTagField,
      properties: options.properties as Electron.SaveDialogOptions['properties'],
      securityScopedBookmarks: options.securityScopedBookmarks,
    };

    // 调用对话框
    if (rawWindow) {
      return dialog.showSaveDialog(rawWindow, dialogOptions);
    }
    return dialog.showSaveDialog(dialogOptions);
  }

  /**
   * 显示消息框
   * @param options 消息框选项
   * @param parentWindow 父窗口（可选）
   * @returns 消息框结果
   */
  async showMessageBox(
    options: MessageBoxOptions,
    parentWindow?: IBrowserWindow
  ): Promise<MessageBoxResult> {
    const electron = getElectron();
    if (!electron) {
      // 浏览器环境的降级处理：使用 confirm/alert
      return this.showBrowserMessageBox(options);
    }

    const { dialog } = electron;
    const rawWindow = getRawWindow(parentWindow);

    // 转换选项
    const dialogOptions: Electron.MessageBoxOptions = {
      type: options.type ?? 'none',
      buttons: options.buttons ?? ['OK'],
      defaultId: options.defaultId ?? 0,
      cancelId: options.cancelId,
      title: options.title,
      message: options.message,
      detail: options.detail,
      checkboxLabel: options.checkboxLabel,
      checkboxChecked: options.checkboxChecked,
      noLink: options.noLink,
      normalizeAccessKeys: options.normalizeAccessKeys,
    };

    // 调用对话框
    if (rawWindow) {
      return dialog.showMessageBox(rawWindow, dialogOptions);
    }
    return dialog.showMessageBox(dialogOptions);
  }

  /**
   * 显示错误框
   * @param title 标题
   * @param content 内容
   */
  showErrorBox(title: string, content: string): void {
    const electron = getElectron();
    if (!electron) {
      // 浏览器环境的降级处理
      // eslint-disable-next-line no-console
      console.error(`${title}: ${content}`);
      if (typeof alert !== 'undefined') {
        alert(`${title}\n\n${content}`);
      }
      return;
    }

    const { dialog } = electron;
    dialog.showErrorBox(title, content);
  }

  // ========== 浏览器降级处理 ==========

  /**
   * 浏览器环境的打开文件对话框
   */
  private async showBrowserOpenDialog(options: OpenDialogOptions): Promise<OpenDialogResult> {
    return new Promise((resolve) => {
      // 创建 input 元素
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';

      // 设置属性
      if (options.properties?.includes('openDirectory')) {
        input.setAttribute('webkitdirectory', '');
      }
      if (options.properties?.includes('multiSelections')) {
        input.multiple = true;
      }

      // 设置文件类型过滤
      if (options.filters && options.filters.length > 0) {
        const accept = options.filters
          .flatMap((f) => f.extensions.map((ext) => `.${ext}`))
          .join(',');
        input.accept = accept;
      }

      // 监听变化
      input.addEventListener('change', () => {
        const files = input.files;
        if (!files || files.length === 0) {
          resolve({ canceled: true, filePaths: [] });
          return;
        }

        // 收集文件路径（在浏览器中只能获取文件名）
        const filePaths: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file) {
            // 使用 webkitRelativePath 或 name
            filePaths.push(file.webkitRelativePath || file.name);
          }
        }

        resolve({ canceled: false, filePaths });
      });

      // 监听取消
      input.addEventListener('cancel', () => {
        resolve({ canceled: true, filePaths: [] });
      });

      // 添加到 DOM 并触发点击
      document.body.appendChild(input);
      input.click();

      // 清理
      setTimeout(() => {
        document.body.removeChild(input);
      }, 100);
    });
  }

  /**
   * 浏览器环境的保存文件对话框
   */
  private async showBrowserSaveDialog(options: SaveDialogOptions): Promise<SaveDialogResult> {
    // 浏览器环境无法真正显示保存对话框
    // 返回默认文件名
    const defaultPath = options.defaultPath ?? 'untitled';
    const extension = options.filters?.[0]?.extensions?.[0] ?? '';
    const filePath = extension ? `${defaultPath}.${extension}` : defaultPath;

    return {
      canceled: false,
      filePath,
    };
  }

  /**
   * 浏览器环境的消息框
   */
  private async showBrowserMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    const buttons = options.buttons ?? ['OK'];
    const message = options.detail
      ? `${options.message}\n\n${options.detail}`
      : options.message;

    // 使用 confirm 或 alert
    if (buttons.length === 1) {
      // 单个按钮，使用 alert
      if (typeof alert !== 'undefined') {
        alert(message);
      }
      return { response: 0, checkboxChecked: false };
    }

    if (buttons.length === 2) {
      // 两个按钮，使用 confirm
      if (typeof confirm !== 'undefined') {
        const result = confirm(message);
        return { response: result ? 0 : 1, checkboxChecked: false };
      }
    }

    // 多个按钮，使用 prompt
    if (typeof prompt !== 'undefined') {
      const buttonList = buttons.map((b, i) => `${i}: ${b}`).join(', ');
      const result = prompt(`${message}\n\n选择: ${buttonList}`);
      const response = parseInt(result ?? '0', 10);
      return {
        response: isNaN(response) ? 0 : response,
        checkboxChecked: false,
      };
    }

    return { response: 0, checkboxChecked: false };
  }
}

/**
 * 全局对话框管理器实例
 */
export const dialogManager = new DialogManager();

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 显示打开文件对话框
 */
export async function showOpenDialog(
  options: OpenDialogOptions,
  parentWindow?: IBrowserWindow
): Promise<OpenDialogResult> {
  return dialogManager.showOpenDialog(options, parentWindow);
}

/**
 * 显示保存文件对话框
 */
export async function showSaveDialog(
  options: SaveDialogOptions,
  parentWindow?: IBrowserWindow
): Promise<SaveDialogResult> {
  return dialogManager.showSaveDialog(options, parentWindow);
}

/**
 * 显示消息框
 */
export async function showMessageBox(
  options: MessageBoxOptions,
  parentWindow?: IBrowserWindow
): Promise<MessageBoxResult> {
  return dialogManager.showMessageBox(options, parentWindow);
}

/**
 * 显示信息消息框
 */
export async function showInfo(
  message: string,
  title?: string,
  parentWindow?: IBrowserWindow
): Promise<void> {
  await dialogManager.showMessageBox(
    {
      type: 'info',
      message,
      title: title ?? '信息',
      buttons: ['确定'],
    },
    parentWindow
  );
}

/**
 * 显示警告消息框
 */
export async function showWarning(
  message: string,
  title?: string,
  parentWindow?: IBrowserWindow
): Promise<void> {
  await dialogManager.showMessageBox(
    {
      type: 'warning',
      message,
      title: title ?? '警告',
      buttons: ['确定'],
    },
    parentWindow
  );
}

/**
 * 显示错误消息框
 */
export async function showError(
  message: string,
  title?: string,
  parentWindow?: IBrowserWindow
): Promise<void> {
  await dialogManager.showMessageBox(
    {
      type: 'error',
      message,
      title: title ?? '错误',
      buttons: ['确定'],
    },
    parentWindow
  );
}

/**
 * 显示确认消息框
 * @returns 用户是否确认
 */
export async function showConfirm(
  message: string,
  title?: string,
  parentWindow?: IBrowserWindow
): Promise<boolean> {
  const result = await dialogManager.showMessageBox(
    {
      type: 'question',
      message,
      title: title ?? '确认',
      buttons: ['确定', '取消'],
      defaultId: 0,
      cancelId: 1,
    },
    parentWindow
  );
  return result.response === 0;
}

/**
 * 显示带自定义按钮的消息框
 * @returns 点击的按钮索引
 */
export async function showQuestion(
  message: string,
  buttons: string[],
  title?: string,
  parentWindow?: IBrowserWindow
): Promise<number> {
  const result = await dialogManager.showMessageBox(
    {
      type: 'question',
      message,
      title: title ?? '选择',
      buttons,
    },
    parentWindow
  );
  return result.response;
}
