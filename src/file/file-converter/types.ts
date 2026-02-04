/**
 * FileConverter 文件转换器类型定义
 * @module @chips/foundation/file/file-converter/types
 */

// ============================================================================
// 转换源类型
// ============================================================================

/**
 * 转换源类型枚举
 * 
 * - 'files': 文件夹结构（编辑器常用），直接传递文件映射
 * - 'data': 标准文件（ZIP 格式），需要先解压
 * - 'path': 文件路径，需要外部先读取
 */
export type ConversionSourceType = 'files' | 'data' | 'path';

/**
 * 转换源定义
 * 描述转换操作的输入来源
 * 
 * 支持两种主要输入方式：
 * 1. 文件夹结构（type: 'files'）- 编辑器直接传递已解压的文件映射
 * 2. 标准文件（type: 'data'）- ZIP 格式数据，转换模块会自动解压
 */
export interface ConversionSource {
  /** 源类型 */
  type: ConversionSourceType;
  /** 文件路径（type 为 path 时必填） */
  path?: string;
  /** 二进制数据 - ZIP 格式（type 为 data 时必填） */
  data?: Uint8Array;
  /** 文件映射 - 文件夹结构（type 为 files 时必填） */
  files?: Map<string, Uint8Array>;
  /** 文件类型标识符（如 'card', 'box'） */
  fileType: string;
}

// ============================================================================
// 转换选项
// ============================================================================

/**
 * 资源处理策略
 */
export type AssetStrategy =
  /** 复制所有资源到输出目录 */
  | 'copy-all'
  /** 仅复制本地资源，保留网络资源引用 */
  | 'copy-local'
  /** 将资源嵌入为 base64 */
  | 'embed'
  /** 仅更新引用路径，不复制资源 */
  | 'reference-only';

/**
 * 通用转换选项
 */
export interface ConversionOptions {
  /** 输出路径（目录或文件） */
  outputPath?: string;
  /** 是否包含资源文件 */
  includeAssets?: boolean;
  /** 主题 ID（覆盖默认主题） */
  themeId?: string;
  /** 资源处理策略 */
  assetStrategy?: AssetStrategy;
  /** 并行处理数量 */
  parallelCount?: number;
  /** 进度回调函数 */
  onProgress?: (progress: ConversionProgress) => void;
  /** 扩展选项（特定转换器的额外配置） */
  extra?: Record<string, unknown>;
}

// ============================================================================
// 转换进度
// ============================================================================

/**
 * 转换状态枚举
 */
export type ConversionStatus =
  | 'pending'     // 等待中
  | 'parsing'     // 解析中
  | 'rendering'   // 渲染中
  | 'processing'  // 处理中
  | 'writing'     // 写入中
  | 'completed'   // 完成
  | 'failed'      // 失败
  | 'cancelled';  // 已取消

/**
 * 转换进度信息
 */
export interface ConversionProgress {
  /** 任务唯一标识符 */
  taskId: string;
  /** 当前状态 */
  status: ConversionStatus;
  /** 完成百分比 (0-100) */
  percent: number;
  /** 当前步骤描述 */
  currentStep?: string;
}

// ============================================================================
// 转换结果
// ============================================================================

/**
 * 转换统计信息
 */
export interface ConversionStats {
  /** 耗时（毫秒） */
  duration: number;
  /** 输入大小（字节） */
  inputSize: number;
  /** 输出大小（字节） */
  outputSize: number;
  /** 处理的基础卡片数量 */
  baseCardCount?: number;
  /** 处理的资源文件数量 */
  resourceCount?: number;
}

/**
 * 输出数据
 */
export interface ConversionOutputData {
  /** 文件映射：相对路径 -> 内容 */
  files: Map<string, string | Uint8Array>;
}

/**
 * 转换结果
 */
export interface ConversionResult {
  /** 是否成功 */
  success: boolean;
  /** 任务唯一标识符 */
  taskId: string;
  /** 输出路径（如果指定了 outputPath） */
  outputPath?: string;
  /** 输出数据（如果未指定 outputPath） */
  data?: ConversionOutputData;
  /** 错误信息（如果失败） */
  error?: ConversionError;
  /** 警告列表 */
  warnings?: string[];
  /** 转换统计 */
  stats?: ConversionStats;
}

// ============================================================================
// 错误定义
// ============================================================================

/**
 * 文件转换错误码
 */
export const FileConverterErrorCode = {
  /** 转换器未找到 */
  CONVERTER_NOT_FOUND: 'FC-001',
  /** 源文件不存在 */
  SOURCE_NOT_FOUND: 'FC-002',
  /** 源文件格式无效 */
  INVALID_SOURCE_FORMAT: 'FC-003',
  /** 目标格式不支持 */
  UNSUPPORTED_TARGET: 'FC-004',
  /** 转换失败 */
  CONVERSION_FAILED: 'FC-005',
  /** 输出写入失败 */
  OUTPUT_WRITE_FAILED: 'FC-006',
  /** 资源处理失败 */
  RESOURCE_ERROR: 'FC-007',
  /** 转换已取消 */
  CANCELLED: 'FC-008',
  /** 插件注册失败 */
  PLUGIN_REGISTER_FAILED: 'FC-009',
  /** 选项验证失败 */
  INVALID_OPTIONS: 'FC-010',
} as const;

/**
 * 错误码类型
 */
export type FileConverterErrorCodeType =
  (typeof FileConverterErrorCode)[keyof typeof FileConverterErrorCode];

/**
 * 转换错误
 */
export interface ConversionError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 相关文件路径 */
  filePath?: string;
  /** 相关任务 ID */
  taskId?: string;
  /** 原始错误 */
  cause?: Error;
}

// ============================================================================
// 插件接口
// ============================================================================

/**
 * 转换类型信息
 */
export interface ConversionTypeInfo {
  /** 源文件类型 */
  sourceType: string;
  /** 目标文件类型 */
  targetType: string;
  /** 描述 */
  description?: string;
}

/**
 * 选项验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors?: string[];
  /** 警告列表 */
  warnings?: string[];
}

/**
 * 转换器插件接口
 * 所有转换插件必须实现此接口
 */
export interface ConverterPlugin {
  /** 插件唯一标识符 */
  readonly id: string;
  /** 插件名称 */
  readonly name: string;
  /** 插件版本 */
  readonly version: string;
  /** 支持的源文件类型列表 */
  readonly sourceTypes: string[];
  /** 目标文件类型 */
  readonly targetType: string;
  /** 插件描述 */
  readonly description?: string;

  /**
   * 执行转换
   * @param source 转换源
   * @param options 转换选项
   * @returns 转换结果
   */
  convert(source: ConversionSource, options?: ConversionOptions): Promise<ConversionResult>;

  /**
   * 获取默认选项
   * @returns 默认转换选项
   */
  getDefaultOptions(): ConversionOptions;

  /**
   * 验证转换选项
   * @param options 待验证的选项
   * @returns 验证结果
   */
  validateOptions(options: ConversionOptions): ValidationResult;

  /**
   * 取消任务（可选实现）
   * @param taskId 任务 ID
   * @returns 是否成功取消
   */
  cancelTask?(taskId: string): boolean;
}

// ============================================================================
// 文件转换器接口
// ============================================================================

/**
 * 文件转换器接口
 * 管理转换插件并提供统一的转换入口
 */
export interface IFileConverter {
  /**
   * 注册转换插件
   * @param plugin 转换插件实例
   */
  registerConverter(plugin: ConverterPlugin): void;

  /**
   * 注销转换插件
   * @param pluginId 插件 ID
   * @returns 是否成功注销
   */
  unregisterConverter(pluginId: string): boolean;

  /**
   * 获取所有支持的转换类型
   * @returns 转换类型信息列表
   */
  getSupportedConversions(): ConversionTypeInfo[];

  /**
   * 检查是否支持指定的转换
   * @param sourceType 源文件类型
   * @param targetType 目标文件类型
   * @returns 是否支持
   */
  canConvert(sourceType: string, targetType: string): boolean;

  /**
   * 获取指定转换的插件
   * @param sourceType 源文件类型
   * @param targetType 目标文件类型
   * @returns 插件实例或 undefined
   */
  getConverter(sourceType: string, targetType: string): ConverterPlugin | undefined;

  /**
   * 执行转换
   * @param source 转换源
   * @param targetType 目标文件类型
   * @param options 转换选项
   * @returns 转换结果
   */
  convert(
    source: ConversionSource,
    targetType: string,
    options?: ConversionOptions
  ): Promise<ConversionResult>;

  /**
   * 取消转换任务
   * @param taskId 任务 ID
   * @returns 是否成功取消
   */
  cancelConversion(taskId: string): boolean;
}
