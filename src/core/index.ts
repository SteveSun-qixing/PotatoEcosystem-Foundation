/**
 * Chips Foundation 核心模块
 * @module @chips/foundation/core
 */

// 类型导出
export * from './types';

// 接口导出
export * from './interfaces';

// 错误导出（使用命名空间避免冲突）
export {
  ErrorCategories,
  ErrorCodes,
  type ErrorCode,
  ChipsError,
  ValidationError as ChipsValidationError,
  ResourceNotFoundError,
  ParseError,
  ModuleError,
  NetworkError,
  FileError,
  RenderError,
  createError,
  isChipsError,
  wrapError,
  formatErrorMessage,
} from './errors';

// 工具函数导出
export * from './utils';
