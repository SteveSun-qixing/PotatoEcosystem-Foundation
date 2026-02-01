/**
 * ZIPProcessor ZIP文件处理器
 * @module @chips/foundation/file/zip-processor/zip-processor
 */

import JSZip from 'jszip';
import { FileError, ErrorCodes } from '../../core/errors';

/**
 * ZIP 文件条目
 */
export interface ZipEntry {
  /** 文件路径 */
  path: string;
  /** 是否为目录 */
  isDirectory: boolean;
  /** 文件大小 */
  size: number;
  /** 压缩大小 */
  compressedSize: number;
  /** 修改时间 */
  date: Date;
}

/**
 * ZIP 提取选项
 */
export interface ZipExtractOptions {
  /** 要提取的文件路径（为空则提取全部） */
  files?: string[];
  /** 是否保留目录结构 */
  preserveStructure?: boolean;
}

/**
 * ZIP 创建选项
 */
export interface ZipCreateOptions {
  /** 压缩级别 (0-9，0=不压缩) */
  compressionLevel?: number;
  /** 是否生成零压缩 ZIP（用于 .card/.box） */
  store?: boolean;
}

/**
 * 文件数据
 */
export interface FileData {
  /** 文件路径 */
  path: string;
  /** 文件内容 */
  content: string | ArrayBuffer | Uint8Array;
}

/**
 * ZIPProcessor ZIP文件处理器
 */
export class ZIPProcessor {
  /**
   * 创建 ZIP 文件
   */
  async create(files: FileData[], options?: ZipCreateOptions): Promise<Uint8Array> {
    const zip = new JSZip();

    for (const file of files) {
      if (typeof file.content === 'string') {
        zip.file(file.path, file.content);
      } else {
        zip.file(file.path, file.content);
      }
    }

    const compression = options?.store ? 'STORE' : 'DEFLATE';

    return zip.generateAsync({
      type: 'uint8array',
      compression,
      compressionOptions: options?.store ? undefined : { level: options?.compressionLevel ?? 6 },
    });
  }

  /**
   * 解压 ZIP 文件
   */
  async extract(
    buffer: ArrayBuffer | Uint8Array,
    options?: ZipExtractOptions
  ): Promise<Map<string, Uint8Array>> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const result = new Map<string, Uint8Array>();

      const files = options?.files;

      for (const [path, zipObject] of Object.entries(zip.files)) {
        if (zipObject.dir) {
          continue;
        }

        // 过滤文件
        if (files && !files.includes(path)) {
          continue;
        }

        const content = await zipObject.async('uint8array');
        result.set(path, content);
      }

      return result;
    } catch (error) {
      throw new FileError(
        ErrorCodes.INVALID_FILE_FORMAT,
        'memory',
        'Invalid ZIP file',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 提取单个文件
   */
  async extractFile(buffer: ArrayBuffer | Uint8Array, filePath: string): Promise<Uint8Array> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const file = zip.file(filePath);

      if (!file) {
        throw new FileError(
          ErrorCodes.FILE_NOT_FOUND,
          filePath,
          `File not found in ZIP: ${filePath}`
        );
      }

      return file.async('uint8array');
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      throw new FileError(
        ErrorCodes.FILE_READ_ERROR,
        filePath,
        'Failed to extract file from ZIP',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 提取文本文件
   */
  async extractText(buffer: ArrayBuffer | Uint8Array, filePath: string): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const file = zip.file(filePath);

      if (!file) {
        throw new FileError(
          ErrorCodes.FILE_NOT_FOUND,
          filePath,
          `File not found in ZIP: ${filePath}`
        );
      }

      return file.async('string');
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      throw new FileError(
        ErrorCodes.FILE_READ_ERROR,
        filePath,
        'Failed to extract text from ZIP',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 列出 ZIP 文件内容
   */
  async list(buffer: ArrayBuffer | Uint8Array): Promise<ZipEntry[]> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const entries: ZipEntry[] = [];

      for (const [path, zipObject] of Object.entries(zip.files)) {
        entries.push({
          path,
          isDirectory: zipObject.dir,
          size: 0, // JSZip 不直接暴露大小，需要解压才能获取
          compressedSize: 0,
          date: zipObject.date,
        });
      }

      return entries;
    } catch (error) {
      throw new FileError(
        ErrorCodes.INVALID_FILE_FORMAT,
        'memory',
        'Invalid ZIP file',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 检查文件是否存在于 ZIP 中
   */
  async hasFile(buffer: ArrayBuffer | Uint8Array, filePath: string): Promise<boolean> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      return zip.file(filePath) !== null;
    } catch {
      return false;
    }
  }

  /**
   * 添加文件到 ZIP
   */
  async addFiles(
    buffer: ArrayBuffer | Uint8Array,
    files: FileData[],
    options?: ZipCreateOptions
  ): Promise<Uint8Array> {
    const zip = await JSZip.loadAsync(buffer);

    for (const file of files) {
      if (typeof file.content === 'string') {
        zip.file(file.path, file.content);
      } else {
        zip.file(file.path, file.content);
      }
    }

    const compression = options?.store ? 'STORE' : 'DEFLATE';

    return zip.generateAsync({
      type: 'uint8array',
      compression,
      compressionOptions: options?.store ? undefined : { level: options?.compressionLevel ?? 6 },
    });
  }

  /**
   * 从 ZIP 中删除文件
   */
  async removeFiles(
    buffer: ArrayBuffer | Uint8Array,
    paths: string[],
    options?: ZipCreateOptions
  ): Promise<Uint8Array> {
    const zip = await JSZip.loadAsync(buffer);

    for (const path of paths) {
      zip.remove(path);
    }

    const compression = options?.store ? 'STORE' : 'DEFLATE';

    return zip.generateAsync({
      type: 'uint8array',
      compression,
      compressionOptions: options?.store ? undefined : { level: options?.compressionLevel ?? 6 },
    });
  }

  /**
   * 验证 ZIP 文件
   */
  async validate(buffer: ArrayBuffer | Uint8Array): Promise<boolean> {
    try {
      await JSZip.loadAsync(buffer);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 全局 ZIP 处理器实例
 */
export const zipProcessor = new ZIPProcessor();
