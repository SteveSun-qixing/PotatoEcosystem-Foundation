/**
 * 文件命名工具
 * @module @chips/foundation/file/file-naming/file-naming
 *
 * 提供生成唯一文件名和目录名的功能，支持重名检测和自动编号。
 * 当目标路径已存在同名文件/目录时，自动在名称后添加编号。
 *
 * @example
 * ```typescript
 * import { generateUniqueFileName } from '@chips/foundation';
 *
 * const result = await generateUniqueFileName({
 *   baseName: '我的卡片',
 *   extension: '.pdf',
 *   directory: '/output',
 *   checkExists: async (path) => {
 *     // 检查文件是否存在的实现
 *     return await checkFileExists(path);
 *   }
 * });
 *
 * if (result.success) {
 *   console.log(result.fullPath); // '/output/我的卡片.pdf' 或 '/output/我的卡片_1.pdf'
 * }
 * ```
 */

import type {
  UniqueFileNameOptions,
  UniqueFileNameResult,
  UniqueDirectoryNameOptions,
  UniqueDirectoryNameResult,
} from './types';

/**
 * 默认配置
 */
const DEFAULT_SEPARATOR = '_';
const DEFAULT_MAX_ATTEMPTS = 1000;

/**
 * 清理文件名中的非法字符
 *
 * @param name 原始名称
 * @returns 清理后的名称
 */
export function sanitizeFileName(name: string): string {
  // 替换 Windows 和 Unix 系统的非法字符
  // Windows: \ / : * ? " < > |
  // 同时移除控制字符
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
}

/**
 * 连接路径（简单实现，兼容浏览器环境）
 *
 * @param parts 路径片段
 * @returns 连接后的路径
 */
function joinPath(...parts: string[]): string {
  return parts
    .map((part, index) => {
      if (index === 0) {
        // 第一个部分，保留开头的斜杠，移除结尾的斜杠
        return part.replace(/\/+$/, '');
      } else {
        // 其他部分，移除两端的斜杠
        return part.replace(/^\/+|\/+$/g, '');
      }
    })
    .filter(Boolean)
    .join('/');
}

/**
 * 生成唯一文件名
 *
 * 检查目标路径是否存在同名文件，如果存在则自动在文件名后添加编号。
 * 编号从 1 开始递增，直到找到不存在的文件名。
 *
 * @param options 生成选项
 * @returns 生成结果，包含最终的文件名和完整路径
 *
 * @example
 * ```typescript
 * // 假设 '/output/报告.pdf' 已存在
 * const result = await generateUniqueFileName({
 *   baseName: '报告',
 *   extension: '.pdf',
 *   directory: '/output',
 *   checkExists: checkFileExists
 * });
 * // result.fileName = '报告_1.pdf'
 * // result.fullPath = '/output/报告_1.pdf'
 * ```
 */
export async function generateUniqueFileName(
  options: UniqueFileNameOptions
): Promise<UniqueFileNameResult> {
  const {
    baseName,
    extension,
    directory,
    checkExists,
    separator = DEFAULT_SEPARATOR,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  } = options;

  // 清理基础名称
  const cleanBaseName = sanitizeFileName(baseName);

  if (!cleanBaseName) {
    return {
      success: false,
      error: '文件名不能为空',
    };
  }

  // 确保扩展名以点开头
  const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;

  // 首先尝试原始文件名
  const originalFileName = `${cleanBaseName}${normalizedExtension}`;
  const originalPath = joinPath(directory, originalFileName);

  try {
    const exists = await checkExists(originalPath);

    if (!exists) {
      // 原始文件名可用
      return {
        success: true,
        fileName: originalFileName,
        fullPath: originalPath,
        hasNumber: false,
      };
    }

    // 原始文件名已存在，尝试添加编号
    for (let i = 1; i <= maxAttempts; i++) {
      const numberedFileName = `${cleanBaseName}${separator}${i}${normalizedExtension}`;
      const numberedPath = joinPath(directory, numberedFileName);

      const numberedExists = await checkExists(numberedPath);

      if (!numberedExists) {
        return {
          success: true,
          fileName: numberedFileName,
          fullPath: numberedPath,
          hasNumber: true,
          number: i,
        };
      }
    }

    // 超过最大尝试次数
    return {
      success: false,
      error: `无法生成唯一文件名：已尝试 ${maxAttempts} 次`,
    };
  } catch (error) {
    return {
      success: false,
      error: `检查文件存在性时出错: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 生成唯一目录名
 *
 * 检查目标路径是否存在同名目录，如果存在则自动在目录名后添加编号。
 * 编号从 1 开始递增，直到找到不存在的目录名。
 *
 * @param options 生成选项
 * @returns 生成结果，包含最终的目录名和完整路径
 *
 * @example
 * ```typescript
 * // 假设 '/output/导出文件夹' 已存在
 * const result = await generateUniqueDirectoryName({
 *   baseName: '导出文件夹',
 *   parentDirectory: '/output',
 *   checkExists: checkDirectoryExists
 * });
 * // result.directoryName = '导出文件夹_1'
 * // result.fullPath = '/output/导出文件夹_1'
 * ```
 */
export async function generateUniqueDirectoryName(
  options: UniqueDirectoryNameOptions
): Promise<UniqueDirectoryNameResult> {
  const {
    baseName,
    parentDirectory,
    checkExists,
    separator = DEFAULT_SEPARATOR,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  } = options;

  // 清理基础名称
  const cleanBaseName = sanitizeFileName(baseName);

  if (!cleanBaseName) {
    return {
      success: false,
      error: '目录名不能为空',
    };
  }

  // 首先尝试原始目录名
  const originalPath = joinPath(parentDirectory, cleanBaseName);

  try {
    const exists = await checkExists(originalPath);

    if (!exists) {
      // 原始目录名可用
      return {
        success: true,
        directoryName: cleanBaseName,
        fullPath: originalPath,
        hasNumber: false,
      };
    }

    // 原始目录名已存在，尝试添加编号
    for (let i = 1; i <= maxAttempts; i++) {
      const numberedName = `${cleanBaseName}${separator}${i}`;
      const numberedPath = joinPath(parentDirectory, numberedName);

      const numberedExists = await checkExists(numberedPath);

      if (!numberedExists) {
        return {
          success: true,
          directoryName: numberedName,
          fullPath: numberedPath,
          hasNumber: true,
          number: i,
        };
      }
    }

    // 超过最大尝试次数
    return {
      success: false,
      error: `无法生成唯一目录名：已尝试 ${maxAttempts} 次`,
    };
  } catch (error) {
    return {
      success: false,
      error: `检查目录存在性时出错: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 从完整路径中提取文件名（不含扩展名）
 *
 * @param filePath 完整文件路径
 * @returns 文件名（不含扩展名）
 */
export function getFileBaseName(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  const dotIndex = fileName.lastIndexOf('.');

  if (dotIndex === -1 || dotIndex === 0) {
    return fileName;
  }

  return fileName.substring(0, dotIndex);
}

/**
 * 从完整路径中提取文件扩展名
 *
 * @param filePath 完整文件路径
 * @returns 扩展名（包含点），如果没有扩展名则返回空字符串
 */
export function getFileExtension(filePath: string): string {
  const fileName = filePath.split('/').pop() || '';
  const dotIndex = fileName.lastIndexOf('.');

  if (dotIndex === -1 || dotIndex === 0) {
    return '';
  }

  return fileName.substring(dotIndex);
}

/**
 * 解析文件名，提取基础名称和编号
 *
 * @param fileName 文件名（可含扩展名）
 * @param separator 编号分隔符，默认为 '_'
 * @returns 解析结果，包含基础名称和编号（如果有）
 *
 * @example
 * ```typescript
 * parseFileName('报告_2.pdf');
 * // { baseName: '报告', number: 2, extension: '.pdf' }
 *
 * parseFileName('报告.pdf');
 * // { baseName: '报告', number: undefined, extension: '.pdf' }
 * ```
 */
export function parseFileName(
  fileName: string,
  separator: string = DEFAULT_SEPARATOR
): {
  baseName: string;
  number?: number;
  extension: string;
} {
  const extension = getFileExtension(fileName);
  const nameWithoutExt = extension
    ? fileName.substring(0, fileName.length - extension.length)
    : fileName;

  // 尝试匹配编号模式
  const pattern = new RegExp(`^(.+)${escapeRegExp(separator)}(\\d+)$`);
  const match = nameWithoutExt.match(pattern);

  if (match) {
    return {
      baseName: match[1],
      number: parseInt(match[2], 10),
      extension,
    };
  }

  return {
    baseName: nameWithoutExt,
    extension,
  };
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
