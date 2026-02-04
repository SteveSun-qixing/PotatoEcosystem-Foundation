/**
 * 文件命名工具类型定义
 * @module @chips/foundation/file/file-naming/types
 */

/**
 * 文件存在性检查函数类型
 * 用于检查指定路径的文件是否存在
 */
export type FileExistsChecker = (path: string) => Promise<boolean>;

/**
 * 生成唯一文件名的选项
 */
export interface UniqueFileNameOptions {
  /** 基础文件名（不含扩展名） */
  baseName: string;
  /** 文件扩展名（包含点，如 '.pdf'） */
  extension: string;
  /** 目标目录路径 */
  directory: string;
  /** 文件存在性检查函数 */
  checkExists: FileExistsChecker;
  /** 编号分隔符，默认为 '_' */
  separator?: string;
  /** 最大尝试次数，默认为 1000 */
  maxAttempts?: number;
}

/**
 * 生成唯一文件名的结果
 */
export interface UniqueFileNameResult {
  /** 是否成功 */
  success: boolean;
  /** 最终的文件名（不含路径） */
  fileName?: string;
  /** 完整的文件路径 */
  fullPath?: string;
  /** 是否添加了编号 */
  hasNumber?: boolean;
  /** 添加的编号（如果有） */
  number?: number;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 目录存在性检查函数类型
 */
export type DirectoryExistsChecker = (path: string) => Promise<boolean>;

/**
 * 生成唯一目录名的选项
 */
export interface UniqueDirectoryNameOptions {
  /** 基础目录名 */
  baseName: string;
  /** 父目录路径 */
  parentDirectory: string;
  /** 目录存在性检查函数 */
  checkExists: DirectoryExistsChecker;
  /** 编号分隔符，默认为 '_' */
  separator?: string;
  /** 最大尝试次数，默认为 1000 */
  maxAttempts?: number;
}

/**
 * 生成唯一目录名的结果
 */
export interface UniqueDirectoryNameResult {
  /** 是否成功 */
  success: boolean;
  /** 最终的目录名（不含路径） */
  directoryName?: string;
  /** 完整的目录路径 */
  fullPath?: string;
  /** 是否添加了编号 */
  hasNumber?: boolean;
  /** 添加的编号（如果有） */
  number?: number;
  /** 错误信息（如果失败） */
  error?: string;
}
