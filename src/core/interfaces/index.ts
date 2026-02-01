/**
 * Chips Foundation 核心接口定义
 * @module @chips/foundation/core/interfaces
 */

import type {
  ModuleStatus,
  ModuleDescriptor,
  CoreRequest,
  CoreResponse,
  LogLevel,
  LogContext,
  LogEntry,
  ConfigScope,
  ConfigChangeCallback,
  SupportedLanguage,
  VocabularyData,
  LanguageTranslations,
} from '../types';

// ============================================================================
// 模块接口
// ============================================================================

/**
 * 模块基础接口
 * 所有模块都必须实现此接口
 */
export interface IModule {
  /** 模块 ID */
  readonly moduleId: string;
  /** 模块名称 */
  readonly moduleName: string;
  /** 版本号 */
  readonly version: string;

  /**
   * 初始化模块
   */
  initialize(): Promise<void>;

  /**
   * 销毁模块
   */
  dispose(): Promise<void>;

  /**
   * 获取模块状态
   */
  getStatus(): ModuleStatus;

  /**
   * 获取模块描述符
   */
  getDescriptor(): ModuleDescriptor;
}

/**
 * 生命周期钩子接口
 */
export interface ILifecycleHooks {
  /**
   * 模块加载前
   */
  onBeforeLoad?(): Promise<void>;

  /**
   * 模块加载后
   */
  onAfterLoad?(): Promise<void>;

  /**
   * 模块卸载前
   */
  onBeforeUnload?(): Promise<void>;

  /**
   * 模块卸载后
   */
  onAfterUnload?(): Promise<void>;
}

// ============================================================================
// 服务接口
// ============================================================================

/**
 * 服务提供者接口
 */
export interface IServiceProvider {
  /**
   * 处理服务请求
   */
  handleRequest<T, R>(request: CoreRequest<T>): Promise<CoreResponse<R>>;

  /**
   * 获取支持的服务列表
   */
  getSupportedServices(): string[];
}

// ============================================================================
// 日志系统接口
// ============================================================================

/**
 * 日志系统接口
 */
export interface ILogSystem {
  /**
   * 调试日志
   */
  debug(message: string, context?: LogContext): void;

  /**
   * 信息日志
   */
  info(message: string, context?: LogContext): void;

  /**
   * 警告日志
   */
  warn(message: string, context?: LogContext): void;

  /**
   * 错误日志
   */
  error(message: string, error?: Error, context?: LogContext): void;

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void;

  /**
   * 获取日志级别
   */
  getLevel(): LogLevel;

  /**
   * 添加日志传输器
   */
  addTransport(transport: ILogTransport): void;

  /**
   * 移除日志传输器
   */
  removeTransport(transportId: string): void;

  /**
   * 查询日志
   */
  query(options: LogQueryOptions): Promise<LogEntry[]>;

  /**
   * 清理日志
   */
  clear(options?: LogClearOptions): Promise<void>;
}

/**
 * 日志传输器接口
 */
export interface ILogTransport {
  /** 传输器 ID */
  readonly id: string;
  /** 传输器名称 */
  readonly name: string;

  /**
   * 写入日志
   */
  write(entry: LogEntry): void | Promise<void>;

  /**
   * 刷新缓冲区
   */
  flush?(): void | Promise<void>;

  /**
   * 销毁传输器
   */
  destroy?(): void | Promise<void>;
}

/**
 * 日志查询选项
 */
export interface LogQueryOptions {
  /** 日志级别过滤 */
  level?: LogLevel;
  /** 模块过滤 */
  module?: string;
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
  /** 搜索关键词 */
  search?: string;
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 日志清理选项
 */
export interface LogClearOptions {
  /** 清理此时间之前的日志 */
  before?: number;
  /** 只清理特定级别 */
  level?: LogLevel;
}

// ============================================================================
// 配置管理器接口
// ============================================================================

/**
 * 配置管理器接口
 */
export interface IConfigManager {
  /**
   * 获取配置
   */
  get<T>(key: string, defaultValue?: T): T | undefined;

  /**
   * 获取所有配置
   */
  getAll(): Record<string, unknown>;

  /**
   * 设置配置
   */
  set(key: string, value: unknown): void;

  /**
   * 批量设置配置
   */
  setMultiple(configs: Record<string, unknown>): void;

  /**
   * 删除配置
   */
  delete(key: string): boolean;

  /**
   * 检查配置是否存在
   */
  has(key: string): boolean;

  /**
   * 监听配置变化
   * @returns 取消监听函数
   */
  watch(key: string, callback: ConfigChangeCallback): () => void;

  /**
   * 从文件加载配置
   */
  load(filePath: string): Promise<void>;

  /**
   * 保存配置到文件
   */
  save(filePath?: string): Promise<void>;

  /**
   * 合并配置
   */
  merge(source: Record<string, unknown>, scope?: ConfigScope): void;
}

// ============================================================================
// 数据序列化器接口
// ============================================================================

/**
 * 数据序列化器接口
 */
export interface IDataSerializer {
  /**
   * 解析 YAML
   */
  parseYAML<T>(content: string): T;

  /**
   * 序列化为 YAML
   */
  stringifyYAML(data: unknown, options?: SerializeOptions): string;

  /**
   * 解析 JSON
   */
  parseJSON<T>(content: string): T;

  /**
   * 序列化为 JSON
   */
  stringifyJSON(data: unknown, options?: SerializeOptions): string;

  /**
   * 通用解析
   */
  parse<T>(content: string, format: DataFormat): T;

  /**
   * 通用序列化
   */
  stringify(data: unknown, format: DataFormat, options?: SerializeOptions): string;

  /**
   * 验证数据
   */
  validate<T>(data: unknown, schema: JSONSchema): ValidationResult<T>;
}

/**
 * 数据格式
 */
export type DataFormat = 'yaml' | 'json';

/**
 * 序列化选项
 */
export interface SerializeOptions {
  /** 是否美化输出 */
  pretty?: boolean;
  /** 缩进空格数 */
  indent?: number;
}

/**
 * JSON Schema 类型
 */
export type JSONSchema = Record<string, unknown>;

/**
 * 验证结果
 */
export interface ValidationResult<T> {
  /** 是否有效 */
  valid: boolean;
  /** 验证后的数据 */
  data?: T;
  /** 验证错误 */
  errors?: ValidationError[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误路径 */
  path: string;
  /** 错误消息 */
  message: string;
  /** 关键字 */
  keyword: string;
}

// ============================================================================
// 多语言系统接口
// ============================================================================

/**
 * 多语言系统接口
 */
export interface II18nSystem {
  /**
   * 翻译文本
   */
  t(code: string, vars?: Record<string, string | number>): string;

  /**
   * 设置语言
   */
  setLanguage(lang: SupportedLanguage): void;

  /**
   * 获取当前语言
   */
  getLanguage(): SupportedLanguage;

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): SupportedLanguage[];

  /**
   * 加载词汇表
   */
  loadVocabulary(vocabulary: VocabularyData): void;

  /**
   * 注册词汇
   */
  registerVocabulary(code: string, translations: LanguageTranslations): void;

  /**
   * 批量翻译
   */
  translateBatch(codes: string[]): Record<string, string>;

  /**
   * 检查词汇是否存在
   */
  hasVocabulary(code: string): boolean;
}

// ============================================================================
// 导出
// ============================================================================

export type {
  ModuleStatus,
  ModuleDescriptor,
  CoreRequest,
  CoreResponse,
  LogLevel,
  LogContext,
  LogEntry,
  ConfigScope,
  ConfigChangeCallback,
  SupportedLanguage,
  VocabularyData,
  LanguageTranslations,
};
