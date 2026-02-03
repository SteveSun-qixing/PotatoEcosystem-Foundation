/**
 * FileConverter 文件转换接口类型定义
 * @module @chips/foundation/file/file-converter/types
 */

// ============================================================================
// 转换类型定义
// ============================================================================

/**
 * 转换类型
 */
export interface ConversionType {
  /** 源文件类型 */
  sourceType: string;
  /** 目标文件类型 */
  targetType: string;
  /** 描述 */
  description?: string;
}

/**
 * 转换源
 */
export interface ConversionSource {
  /** 源类型 */
  type: 'file' | 'data' | 'url';
  /** 文件路径（type 为 file 时） */
  path?: string;
  /** 数据内容（type 为 data 时） */
  data?: Uint8Array | string;
  /** URL 地址（type 为 url 时） */
  url?: string;
  /** 源文件类型（如 card, html, markdown） */
  sourceType: string;
  /** MIME 类型 */
  mimeType?: string;
}

/**
 * 转换选项
 */
export interface ConversionOptions {
  /** 输出路径（可选） */
  outputPath?: string;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 质量（用于图片/PDF 等） */
  quality?: number;
  /** 分辨率（用于图片） */
  resolution?: {
    width?: number;
    height?: number;
    dpi?: number;
  };
  /** 页面设置（用于 PDF） */
  page?: {
    size?: 'A4' | 'A3' | 'Letter' | 'Legal' | 'custom';
    orientation?: 'portrait' | 'landscape';
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    customWidth?: number;
    customHeight?: number;
  };
  /** 是否包含封面 */
  includeCover?: boolean;
  /** 是否包含目录 */
  includeTableOfContents?: boolean;
  /** 主题 ID */
  themeId?: string;
  /** 额外的自定义选项 */
  custom?: Record<string, unknown>;
}

/**
 * 转换结果
 */
export interface ConversionResult {
  /** 是否成功 */
  success: boolean;
  /** 输出路径（如果输出到文件） */
  outputPath?: string;
  /** 输出数据（如果输出到内存） */
  data?: Uint8Array;
  /** 输出 MIME 类型 */
  mimeType: string;
  /** 转换统计信息 */
  stats: ConversionStats;
  /** 错误信息（失败时） */
  error?: ConversionError;
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 转换统计信息
 */
export interface ConversionStats {
  /** 转换耗时（毫秒） */
  duration: number;
  /** 输入大小（字节） */
  inputSize: number;
  /** 输出大小（字节） */
  outputSize: number;
  /** 处理的元素数量 */
  elementCount?: number;
  /** 其他统计 */
  extra?: Record<string, unknown>;
}

/**
 * 转换错误
 */
export interface ConversionError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 详细信息 */
  details?: unknown;
}

// ============================================================================
// 转换插件
// ============================================================================

/**
 * 转换插件接口
 */
export interface ConverterPlugin {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 支持的源文件类型 */
  sourceTypes: string[];
  /** 目标文件类型 */
  targetType: string;
  /** 目标 MIME 类型 */
  targetMimeType: string;
  /** 支持的选项 */
  supportedOptions?: string[];

  /**
   * 执行转换
   * @param source - 转换源
   * @param options - 转换选项
   */
  convert(source: ConversionSource, options?: ConversionOptions): Promise<ConversionResult>;

  /**
   * 验证源文件
   * @param source - 转换源
   */
  validateSource?(source: ConversionSource): Promise<boolean>;

  /**
   * 获取预估输出大小
   * @param source - 转换源
   * @param options - 转换选项
   */
  estimateOutputSize?(source: ConversionSource, options?: ConversionOptions): Promise<number>;
}

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  /** 插件实例 */
  plugin: ConverterPlugin;
  /** 注册时间 */
  registeredAt: number;
  /** 优先级（数字越大优先级越高） */
  priority: number;
}

// ============================================================================
// 转换任务
// ============================================================================

/**
 * 转换任务状态
 */
export type ConversionTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * 转换任务
 */
export interface ConversionTask {
  /** 任务 ID */
  id: string;
  /** 状态 */
  status: ConversionTaskStatus;
  /** 进度（0-100） */
  progress: number;
  /** 转换源 */
  source: ConversionSource;
  /** 目标类型 */
  targetType: string;
  /** 转换选项 */
  options?: ConversionOptions;
  /** 创建时间 */
  createdAt: number;
  /** 开始时间 */
  startedAt?: number;
  /** 完成时间 */
  completedAt?: number;
  /** 结果 */
  result?: ConversionResult;
}

/**
 * 进度回调
 */
export type ProgressCallback = (progress: number, message?: string) => void;

// ============================================================================
// 接口定义
// ============================================================================

/**
 * 文件转换接口
 */
export interface IFileConverter {
  /**
   * 注册转换插件
   * @param converter - 转换插件
   * @param priority - 优先级（默认为 0）
   */
  registerConverter(converter: ConverterPlugin, priority?: number): void;

  /**
   * 注销转换插件
   * @param converterId - 插件 ID
   */
  unregisterConverter(converterId: string): void;

  /**
   * 获取支持的转换类型
   */
  getSupportedConversions(): ConversionType[];

  /**
   * 执行转换
   * @param source - 转换源
   * @param targetType - 目标类型
   * @param options - 转换选项
   */
  convert(
    source: ConversionSource,
    targetType: string,
    options?: ConversionOptions
  ): Promise<ConversionResult>;

  /**
   * 检查是否支持某种转换
   * @param sourceType - 源类型
   * @param targetType - 目标类型
   */
  canConvert(sourceType: string, targetType: string): boolean;

  /**
   * 获取指定转换的可用插件
   * @param sourceType - 源类型
   * @param targetType - 目标类型
   */
  getConverters(sourceType: string, targetType: string): ConverterPlugin[];

  /**
   * 获取所有已注册的插件
   */
  getAllPlugins(): ConverterPlugin[];
}

// ============================================================================
// 预定义的文件类型
// ============================================================================

/**
 * 预定义的源文件类型
 */
export const SourceTypes = {
  /** 薯片卡片 */
  CARD: 'card',
  /** 薯片箱子 */
  BOX: 'box',
  /** Markdown 文件 */
  MARKDOWN: 'markdown',
  /** HTML 网页 */
  HTML: 'html',
  /** 纯文本 */
  TEXT: 'text',
  /** JSON 数据 */
  JSON: 'json',
  /** YAML 数据 */
  YAML: 'yaml',
} as const;

/**
 * 预定义的目标文件类型
 */
export const TargetTypes = {
  /** HTML 网页 */
  HTML: 'html',
  /** PDF 文档 */
  PDF: 'pdf',
  /** PNG 图片 */
  PNG: 'png',
  /** JPEG 图片 */
  JPEG: 'jpeg',
  /** Markdown */
  MARKDOWN: 'markdown',
  /** 薯片卡片 */
  CARD: 'card',
} as const;

/**
 * MIME 类型映射
 */
export const MimeTypes: Record<string, string> = {
  html: 'text/html',
  pdf: 'application/pdf',
  png: 'image/png',
  jpeg: 'image/jpeg',
  markdown: 'text/markdown',
  card: 'application/x-chips-card',
  box: 'application/x-chips-box',
  json: 'application/json',
  yaml: 'text/yaml',
  text: 'text/plain',
};
