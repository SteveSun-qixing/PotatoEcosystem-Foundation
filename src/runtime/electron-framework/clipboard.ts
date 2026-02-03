/**
 * Clipboard 剪贴板封装
 * @module @chips/foundation/runtime/electron-framework/clipboard
 *
 * 提供剪贴板操作的封装，支持 Electron 和浏览器环境
 */

import type { IClipboard, NativeImage } from './types';

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

// ============================================================================
// 剪贴板管理器
// ============================================================================

/**
 * 剪贴板管理器
 * 提供跨平台的剪贴板操作
 */
export class ClipboardManager implements IClipboard {
  // ========== 文本操作 ==========

  /**
   * 读取文本
   */
  readText(): string {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.readText();
    }

    // 浏览器环境降级处理
    // 注意：浏览器中无法同步读取剪贴板
    return '';
  }

  /**
   * 读取文本（异步，支持浏览器）
   */
  async readTextAsync(): Promise<string> {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.readText();
    }

    // 浏览器环境使用 Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to read clipboard text:', error);
        return '';
      }
    }

    return '';
  }

  /**
   * 写入文本
   */
  writeText(text: string): void {
    const electron = getElectron();
    if (electron) {
      electron.clipboard.writeText(text);
      return;
    }

    // 浏览器环境降级处理
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch((error) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to write clipboard text:', error);
      });
      return;
    }

    // 降级：使用 document.execCommand
    this.fallbackCopyText(text);
  }

  // ========== HTML 操作 ==========

  /**
   * 读取 HTML
   */
  readHTML(): string {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.readHTML();
    }

    // 浏览器环境不支持同步读取 HTML
    return '';
  }

  /**
   * 读取 HTML（异步，支持浏览器）
   */
  async readHTMLAsync(): Promise<string> {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.readHTML();
    }

    // 浏览器环境使用 Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            return await blob.text();
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to read clipboard HTML:', error);
      }
    }

    return '';
  }

  /**
   * 写入 HTML
   */
  writeHTML(markup: string): void {
    const electron = getElectron();
    if (electron) {
      electron.clipboard.writeHTML(markup);
      return;
    }

    // 浏览器环境使用 Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const blob = new Blob([markup], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob });
      void navigator.clipboard.write([item]).catch((error) => {
        // eslint-disable-next-line no-console
        console.warn('Failed to write clipboard HTML:', error);
      });
    }
  }

  // ========== 图片操作 ==========

  /**
   * 读取图片
   */
  readImage(): NativeImage | null {
    const electron = getElectron();
    if (electron) {
      const image = electron.clipboard.readImage();
      if (image.isEmpty()) {
        return null;
      }
      return image as unknown as NativeImage;
    }

    // 浏览器环境不支持同步读取图片
    return null;
  }

  /**
   * 读取图片（异步，支持浏览器）
   * @returns 图片的 Blob 对象
   */
  async readImageAsync(): Promise<Blob | null> {
    const electron = getElectron();
    if (electron) {
      const image = electron.clipboard.readImage();
      if (image.isEmpty()) {
        return null;
      }
      const pngData = image.toPNG();
      return new Blob([pngData], { type: 'image/png' });
    }

    // 浏览器环境使用 Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageTypes = item.types.filter((t) => t.startsWith('image/'));
          if (imageTypes.length > 0) {
            return await item.getType(imageTypes[0]!);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to read clipboard image:', error);
      }
    }

    return null;
  }

  /**
   * 写入图片
   */
  writeImage(image: NativeImage): void {
    const electron = getElectron();
    if (electron) {
      electron.clipboard.writeImage(image as unknown as Electron.NativeImage);
      return;
    }

    // 浏览器环境不支持直接写入 NativeImage
    // eslint-disable-next-line no-console
    console.warn('writeImage is not supported in browser environment');
  }

  /**
   * 写入图片（从 Blob，支持浏览器）
   */
  async writeImageFromBlob(blob: Blob): Promise<void> {
    const electron = getElectron();
    if (electron) {
      // 转换 Blob 为 NativeImage
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const image = electron.nativeImage.createFromBuffer(buffer);
      electron.clipboard.writeImage(image);
      return;
    }

    // 浏览器环境使用 Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to write clipboard image:', error);
      }
    }
  }

  // ========== RTF 操作 ==========

  /**
   * 读取 RTF
   */
  readRTF(): string {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.readRTF();
    }
    return '';
  }

  /**
   * 写入 RTF
   */
  writeRTF(text: string): void {
    const electron = getElectron();
    if (electron) {
      electron.clipboard.writeRTF(text);
    }
  }

  // ========== 书签操作 ==========

  /**
   * 读取书签
   */
  readBookmark(): { title: string; url: string } {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.readBookmark();
    }
    return { title: '', url: '' };
  }

  /**
   * 写入书签
   */
  writeBookmark(title: string, url: string): void {
    const electron = getElectron();
    if (electron) {
      electron.clipboard.writeBookmark(title, url);
    }
  }

  // ========== 查找文本操作 ==========

  /**
   * 读取查找文本
   */
  readFindText(): string {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.readFindText();
    }
    return '';
  }

  /**
   * 写入查找文本
   */
  writeFindText(text: string): void {
    const electron = getElectron();
    if (electron) {
      electron.clipboard.writeFindText(text);
    }
  }

  // ========== 其他操作 ==========

  /**
   * 清空剪贴板
   */
  clear(): void {
    const electron = getElectron();
    if (electron) {
      electron.clipboard.clear();
      return;
    }

    // 浏览器环境：写入空文本
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText('').catch(() => {});
    }
  }

  /**
   * 获取可用格式
   */
  availableFormats(): string[] {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.availableFormats();
    }
    return [];
  }

  /**
   * 是否有指定格式
   */
  has(format: string): boolean {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.has(format);
    }
    return false;
  }

  /**
   * 读取指定格式
   */
  read(format: string): string {
    const electron = getElectron();
    if (electron) {
      return electron.clipboard.read(format);
    }
    return '';
  }

  /**
   * 写入指定格式
   */
  write(data: { text?: string; html?: string; image?: NativeImage; rtf?: string }): void {
    const electron = getElectron();
    if (electron) {
      electron.clipboard.write({
        text: data.text,
        html: data.html,
        image: data.image as unknown as Electron.NativeImage,
        rtf: data.rtf,
      });
      return;
    }

    // 浏览器环境降级处理：只支持文本和 HTML
    if (data.text) {
      this.writeText(data.text);
    } else if (data.html) {
      this.writeHTML(data.html);
    }
  }

  // ========== 私有方法 ==========

  /**
   * 降级复制文本（使用 execCommand）
   */
  private fallbackCopyText(text: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;

    // 避免滚动
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Fallback: Could not copy text:', error);
    }

    document.body.removeChild(textArea);
  }
}

/**
 * 全局剪贴板管理器实例
 */
export const clipboardManager = new ClipboardManager();

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 复制文本到剪贴板
 */
export function copyText(text: string): void {
  clipboardManager.writeText(text);
}

/**
 * 从剪贴板读取文本
 */
export async function pasteText(): Promise<string> {
  return clipboardManager.readTextAsync();
}

/**
 * 复制 HTML 到剪贴板
 */
export function copyHTML(html: string): void {
  clipboardManager.writeHTML(html);
}

/**
 * 从剪贴板读取 HTML
 */
export async function pasteHTML(): Promise<string> {
  return clipboardManager.readHTMLAsync();
}

/**
 * 从剪贴板读取图片
 */
export async function pasteImage(): Promise<Blob | null> {
  return clipboardManager.readImageAsync();
}

/**
 * 复制图片到剪贴板
 */
export async function copyImage(blob: Blob): Promise<void> {
  return clipboardManager.writeImageFromBlob(blob);
}

/**
 * 清空剪贴板
 */
export function clearClipboard(): void {
  clipboardManager.clear();
}

/**
 * 检查剪贴板是否有文本
 */
export function hasText(): boolean {
  return clipboardManager.has('text/plain');
}

/**
 * 检查剪贴板是否有 HTML
 */
export function hasHTML(): boolean {
  return clipboardManager.has('text/html');
}

/**
 * 检查剪贴板是否有图片
 */
export function hasImage(): boolean {
  const formats = clipboardManager.availableFormats();
  return formats.some((f) => f.startsWith('image/'));
}
