/**
 * FileIdentifier 文件类型识别器
 * @module @chips/foundation/file/file-identifier/file-identifier
 */

import { FILE_SIGNATURES, EXTENSION_MIME_MAP } from './magic-bytes';

/**
 * 文件识别结果
 */
export interface FileIdentifyResult {
  /** MIME 类型 */
  mime: string;
  /** 扩展名 */
  extension: string;
  /** 是否为 Chips 格式 */
  isChipsFormat: boolean;
  /** Chips 格式类型 */
  chipsType?: 'card' | 'box';
  /** 描述 */
  description: string;
  /** 置信度 (0-1) */
  confidence: number;
}

/**
 * 文件识别输入
 */
export interface FileIdentifyInput {
  /** 文件名（可选） */
  filename?: string;
  /** 文件内容（可选，用于魔数检测） */
  buffer?: ArrayBuffer | Uint8Array;
}

/**
 * FileIdentifier 文件类型识别器
 */
export class FileIdentifier {
  /**
   * 识别文件类型
   */
  identify(input: FileIdentifyInput): FileIdentifyResult {
    let result: FileIdentifyResult | null = null;

    // 优先使用魔数识别
    if (input.buffer) {
      result = this.identifyByMagicBytes(input.buffer);
    }

    // 如果魔数识别失败或置信度低，使用扩展名
    if ((!result || result.confidence < 0.8) && input.filename) {
      const extResult = this.identifyByExtension(input.filename);

      // 合并结果
      if (extResult) {
        if (!result) {
          result = extResult;
        } else if (result.mime === extResult.mime) {
          result.confidence = Math.max(result.confidence, extResult.confidence);
        }
      }
    }

    // 如果是 ZIP 格式，进一步检测是否为 Chips 格式
    if (result && result.mime === 'application/zip' && input.filename) {
      const chipsResult = this.checkChipsFormat(input.filename, input.buffer);
      if (chipsResult) {
        return chipsResult;
      }
    }

    // 默认返回未知类型
    return (
      result ?? {
        mime: 'application/octet-stream',
        extension: 'bin',
        isChipsFormat: false,
        description: 'Unknown binary file',
        confidence: 0,
      }
    );
  }

  /**
   * 通过魔数识别
   */
  identifyByMagicBytes(buffer: ArrayBuffer | Uint8Array): FileIdentifyResult | null {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

    for (const sig of FILE_SIGNATURES) {
      const offset = sig.offset ?? 0;
      let match = true;

      for (let i = 0; i < sig.magicBytes.length; i++) {
        if (bytes[offset + i] !== sig.magicBytes[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        return {
          mime: sig.mime,
          extension: sig.extension,
          isChipsFormat: false,
          description: sig.description,
          confidence: 0.9,
        };
      }
    }

    return null;
  }

  /**
   * 通过扩展名识别
   */
  identifyByExtension(filename: string): FileIdentifyResult | null {
    const ext = this.getExtension(filename);
    if (!ext) {
      return null;
    }

    const mime = EXTENSION_MIME_MAP[ext];
    if (!mime) {
      return null;
    }

    // 检查是否为 Chips 格式
    if (ext === 'card' || ext === 'box') {
      return {
        mime,
        extension: ext,
        isChipsFormat: true,
        chipsType: ext as 'card' | 'box',
        description: ext === 'card' ? 'Chips Card file' : 'Chips Box file',
        confidence: 0.95,
      };
    }

    return {
      mime,
      extension: ext,
      isChipsFormat: false,
      description: `${ext.toUpperCase()} file`,
      confidence: 0.7,
    };
  }

  /**
   * 检查是否为 Chips 格式
   */
  private checkChipsFormat(
    filename: string,
    _buffer?: ArrayBuffer | Uint8Array
  ): FileIdentifyResult | null {
    const ext = this.getExtension(filename);

    if (ext === 'card') {
      return {
        mime: 'application/x-chips-card',
        extension: 'card',
        isChipsFormat: true,
        chipsType: 'card',
        description: 'Chips Card file',
        confidence: 0.95,
      };
    }

    if (ext === 'box') {
      return {
        mime: 'application/x-chips-box',
        extension: 'box',
        isChipsFormat: true,
        chipsType: 'box',
        description: 'Chips Box file',
        confidence: 0.95,
      };
    }

    return null;
  }

  /**
   * 获取文件扩展名
   */
  getExtension(filename: string): string | null {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return null;
    }
    return filename.slice(lastDot + 1).toLowerCase();
  }

  /**
   * 获取 MIME 类型
   */
  getMimeType(filename: string): string {
    const ext = this.getExtension(filename);
    if (!ext) {
      return 'application/octet-stream';
    }
    return EXTENSION_MIME_MAP[ext] ?? 'application/octet-stream';
  }

  /**
   * 检查是否为图片
   */
  isImage(filename: string): boolean {
    const mime = this.getMimeType(filename);
    return mime.startsWith('image/');
  }

  /**
   * 检查是否为视频
   */
  isVideo(filename: string): boolean {
    const mime = this.getMimeType(filename);
    return mime.startsWith('video/');
  }

  /**
   * 检查是否为音频
   */
  isAudio(filename: string): boolean {
    const mime = this.getMimeType(filename);
    return mime.startsWith('audio/');
  }

  /**
   * 检查是否为文本
   */
  isText(filename: string): boolean {
    const mime = this.getMimeType(filename);
    return (
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'application/xml' ||
      mime === 'application/x-yaml'
    );
  }
}

/**
 * 全局文件识别器实例
 */
export const fileIdentifier = new FileIdentifier();
