/**
 * Chips Foundation 错误处理
 * @module @chips/foundation/core/errors
 */

// ============================================================================
// 错误代码定义
// ============================================================================

/**
 * 错误代码分类
 */
export const ErrorCategories = {
  /** 验证错误 */
  VALIDATION: 'VAL',
  /** 权限错误 */
  PERMISSION: 'PERM',
  /** 资源错误 */
  RESOURCE: 'RES',
  /** 序列化错误 */
  SERIALIZATION: 'SER',
  /** 网络错误 */
  NETWORK: 'NET',
  /** 文件错误 */
  FILE: 'FILE',
  /** 模块错误 */
  MODULE: 'MOD',
  /** 渲染错误 */
  RENDER: 'REND',
  /** 系统错误 */
  SYSTEM: 'SYS',
} as const;

/**
 * 预定义错误代码
 */
export const ErrorCodes = {
  // 验证错误 (VAL-1xxx)
  INVALID_INPUT: 'VAL-1001',
  INVALID_ID: 'VAL-1002',
  INVALID_FORMAT: 'VAL-1003',
  MISSING_REQUIRED: 'VAL-1004',
  TYPE_MISMATCH: 'VAL-1005',

  // 权限错误 (PERM-2xxx)
  PERMISSION_DENIED: 'PERM-2001',
  UNAUTHORIZED: 'PERM-2002',

  // 资源错误 (RES-3xxx)
  RESOURCE_NOT_FOUND: 'RES-3001',
  RESOURCE_ALREADY_EXISTS: 'RES-3002',
  RESOURCE_UNAVAILABLE: 'RES-3003',

  // 序列化错误 (SER-4xxx)
  PARSE_ERROR: 'SER-4001',
  STRINGIFY_ERROR: 'SER-4002',
  SCHEMA_VALIDATION_FAILED: 'SER-4003',

  // 网络错误 (NET-5xxx)
  NETWORK_ERROR: 'NET-5001',
  TIMEOUT: 'NET-5002',
  CONNECTION_REFUSED: 'NET-5003',

  // 文件错误 (FILE-6xxx)
  FILE_NOT_FOUND: 'FILE-6001',
  FILE_READ_ERROR: 'FILE-6002',
  FILE_WRITE_ERROR: 'FILE-6003',
  INVALID_FILE_FORMAT: 'FILE-6004',

  // 模块错误 (MOD-7xxx)
  MODULE_NOT_FOUND: 'MOD-7001',
  MODULE_LOAD_ERROR: 'MOD-7002',
  MODULE_INIT_ERROR: 'MOD-7003',
  CIRCULAR_DEPENDENCY: 'MOD-7004',

  // 渲染错误 (REND-8xxx)
  RENDER_ERROR: 'REND-8001',
  RENDERER_NOT_FOUND: 'REND-8002',
  THEME_NOT_FOUND: 'REND-8003',

  // 系统错误 (SYS-9xxx)
  INTERNAL_ERROR: 'SYS-9001',
  NOT_IMPLEMENTED: 'SYS-9002',
  UNKNOWN_ERROR: 'SYS-9999',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// 错误类定义
// ============================================================================

/**
 * Chips 基础错误类
 * 所有 Chips Foundation 的错误都继承此类
 */
export class ChipsError extends Error {
  /** 错误代码 */
  public readonly code: string;
  /** 详细信息 */
  public readonly details?: unknown;
  /** 时间戳 */
  public readonly timestamp: number;
  /** 原始错误 */
  public readonly originalCause?: Error;

  constructor(code: string, message: string, details?: unknown, originalCause?: Error) {
    super(message, { cause: originalCause });
    this.name = 'ChipsError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    this.originalCause = originalCause;

    // 保持原型链
    Object.setPrototypeOf(this, ChipsError.prototype);

    // 捕获堆栈
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChipsError);
    }
  }

  /**
   * 转换为 JSON 对象
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.originalCause
        ? {
            name: this.originalCause.name,
            message: this.originalCause.message,
            stack: this.originalCause.stack,
          }
        : undefined,
    };
  }

  /**
   * 转换为字符串
   */
  override toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}

// ============================================================================
// 特定错误类
// ============================================================================

/**
 * 验证错误
 */
export class ValidationError extends ChipsError {
  constructor(message: string, details?: unknown) {
    super(ErrorCodes.INVALID_INPUT, message, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  override toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}

/**
 * 资源未找到错误
 */
export class ResourceNotFoundError extends ChipsError {
  constructor(resourceType: string, resourceId: string) {
    super(
      ErrorCodes.RESOURCE_NOT_FOUND,
      `${resourceType} not found: ${resourceId}`,
      { resourceType, resourceId }
    );
    this.name = 'ResourceNotFoundError';
    Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
  }
}

/**
 * 解析错误
 */
export class ParseError extends ChipsError {
  constructor(format: string, message: string, cause?: Error) {
    super(ErrorCodes.PARSE_ERROR, `Failed to parse ${format}: ${message}`, { format }, cause);
    this.name = 'ParseError';
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

/**
 * 模块错误
 */
export class ModuleError extends ChipsError {
  constructor(code: string, moduleId: string, message: string, cause?: Error) {
    super(code, message, { moduleId }, cause);
    this.name = 'ModuleError';
    Object.setPrototypeOf(this, ModuleError.prototype);
  }
}

/**
 * 网络错误
 */
export class NetworkError extends ChipsError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super(ErrorCodes.NETWORK_ERROR, message, details, cause);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * 文件错误
 */
export class FileError extends ChipsError {
  constructor(code: string, filePath: string, message: string, cause?: Error) {
    super(code, message, { filePath }, cause);
    this.name = 'FileError';
    Object.setPrototypeOf(this, FileError.prototype);
  }
}

/**
 * 渲染错误
 */
export class RenderError extends ChipsError {
  constructor(message: string, details?: unknown, cause?: Error) {
    super(ErrorCodes.RENDER_ERROR, message, details, cause);
    this.name = 'RenderError';
    Object.setPrototypeOf(this, RenderError.prototype);
  }
}

// ============================================================================
// 错误工具函数
// ============================================================================

/**
 * 创建错误
 */
export function createError(code: string, message: string, details?: unknown): ChipsError {
  return new ChipsError(code, message, details);
}

/**
 * 检查是否为 ChipsError
 */
export function isChipsError(error: unknown): error is ChipsError {
  return error instanceof ChipsError;
}

/**
 * 包装错误
 * 将普通 Error 转换为 ChipsError
 */
export function wrapError(error: unknown, code?: string): ChipsError {
  if (isChipsError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ChipsError(
      code ?? ErrorCodes.UNKNOWN_ERROR,
      error.message,
      { originalError: error.name },
      error
    );
  }

  return new ChipsError(
    code ?? ErrorCodes.UNKNOWN_ERROR,
    String(error),
    { originalValue: error }
  );
}

/**
 * 格式化错误消息
 */
export function formatErrorMessage(error: ChipsError): string {
  let message = `[${error.code}] ${error.message}`;

  if (error.details) {
    message += `\nDetails: ${JSON.stringify(error.details, null, 2)}`;
  }

  if (error.originalCause) {
    message += `\nCaused by: ${error.originalCause.message}`;
  }

  return message;
}
