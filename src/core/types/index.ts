/**
 * Chips Foundation 核心类型定义
 * @module @chips/foundation/core/types
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 10位62进制 ID 类型
 * 用于卡片、箱子、基础卡片等实体的唯一标识
 */
export type ChipsId = string & { readonly __brand: 'ChipsId' };

/**
 * 卡片 ID
 */
export type CardId = ChipsId & { readonly __cardBrand: 'CardId' };

/**
 * 箱子 ID
 */
export type BoxId = ChipsId & { readonly __boxBrand: 'BoxId' };

/**
 * 基础卡片 ID
 */
export type BaseCardId = ChipsId & { readonly __baseCardBrand: 'BaseCardId' };

// ============================================================================
// 请求响应类型
// ============================================================================

/**
 * 核心请求格式
 * 所有模块间的通信都使用此格式
 */
export interface CoreRequest<T = unknown> {
  /** 目标模块名称 */
  target: string;
  /** 操作名称 */
  action: string;
  /** 请求参数 */
  params: T;
  /** 请求 ID（可选，用于追踪） */
  requestId?: string;
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 核心响应格式
 */
export interface CoreResponse<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据（成功时） */
  data?: T;
  /** 错误信息（失败时） */
  error?: CoreErrorInfo;
  /** 请求 ID */
  requestId?: string;
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 核心错误信息
 */
export interface CoreErrorInfo {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 详细信息 */
  details?: unknown;
}

// ============================================================================
// 模块类型
// ============================================================================

/**
 * 模块状态
 */
export type ModuleStatus = 'unloaded' | 'loading' | 'loaded' | 'error' | 'disposed';

/**
 * 模块描述符
 */
export interface ModuleDescriptor {
  /** 模块唯一标识 */
  id: string;
  /** 模块名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 描述 */
  description: string;
  /** 依赖的模块 ID 列表 */
  dependencies: string[];
  /** 提供的服务列表 */
  services: ServiceDescriptor[];
}

/**
 * 服务描述符
 */
export interface ServiceDescriptor {
  /** 服务名称（如 card.read） */
  name: string;
  /** 处理方法 */
  handler: string;
  /** 输入参数 Schema */
  inputSchema?: Record<string, unknown>;
  /** 输出数据 Schema */
  outputSchema?: Record<string, unknown>;
  /** 所需权限 */
  permissions?: string[];
}

// ============================================================================
// 卡片相关类型
// ============================================================================

/**
 * 卡片元数据
 */
export interface CardMetadata {
  /** 卡片 ID */
  id: CardId;
  /** 卡片名称 */
  name: string;
  /** 创建时间 */
  created_at: string;
  /** 修改时间 */
  modified_at: string;
  /** 主题 ID */
  theme?: string;
  /** 标签 */
  tags?: string[];
  /** 作者 */
  author?: string;
  /** 描述 */
  description?: string;
}

/**
 * 卡片结构
 */
export interface CardStructure {
  /** 基础卡片列表 */
  base_cards: BaseCardEntry[];
  /** 主题配置 */
  theme_config?: ThemeConfig;
}

/**
 * 基础卡片条目
 */
export interface BaseCardEntry {
  /** 基础卡片 ID */
  id: BaseCardId;
  /** 卡片类型 */
  type: string;
  /** 排序顺序 */
  order: number;
}

/**
 * 基础卡片配置（通用结构）
 */
export interface BaseCardConfig<T = unknown> {
  /** 卡片类型 */
  card_type: string;
  /** 该卡片的主题（为空则使用上级主题） */
  theme?: string;
  /** 布局配置 */
  layout?: BaseCardLayout;
  /** 内容配置（由各类型定义） */
  content: T;
}

/**
 * 基础卡片布局配置
 */
export interface BaseCardLayout {
  /** 高度模式 */
  height_mode?: 'auto' | 'fixed';
  /** 固定高度（像素） */
  fixed_height?: number;
  /** 宽高比（如 16:9） */
  aspect_ratio?: string;
}

// ============================================================================
// 箱子相关类型
// ============================================================================

/**
 * 箱子元数据
 */
export interface BoxMetadata {
  /** 箱子 ID */
  id: BoxId;
  /** 箱子名称 */
  name: string;
  /** 创建时间 */
  created_at: string;
  /** 修改时间 */
  modified_at: string;
  /** 主题 ID */
  theme?: string;
  /** 描述 */
  description?: string;
}

/**
 * 箱子结构
 */
export interface BoxStructure {
  /** 卡片列表 */
  cards: BoxCardEntry[];
  /** 布局配置 */
  layout_config: LayoutConfig;
}

/**
 * 箱子中的卡片条目
 */
export interface BoxCardEntry {
  /** 卡片 ID */
  id: CardId;
  /** 卡片位置（内部/外部） */
  location: 'internal' | 'external';
  /** 卡片路径（相对或绝对） */
  path: string;
  /** 卡片元数据（预加载） */
  metadata?: Partial<CardMetadata>;
}

/**
 * 布局配置
 */
export interface LayoutConfig {
  /** 布局类型 */
  layout_type: string;
  /** 布局特定配置 */
  [key: string]: unknown;
}

// ============================================================================
// 主题相关类型
// ============================================================================

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 主题 ID */
  theme_id?: string;
  /** 组件级主题配置 */
  component_themes?: Record<string, string>;
}

/**
 * 主题层级配置
 */
export interface ThemeHierarchyConfig {
  /** 组件级主题 */
  componentTheme?: string;
  /** 卡片级主题 */
  cardTheme?: string;
  /** 应用级主题 */
  appTheme?: string;
  /** 全局主题 */
  globalTheme?: string;
}

/**
 * 主题定义
 */
export interface Theme {
  /** 主题 ID（格式：发行商:主题名） */
  id: string;
  /** 主题名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 主题类型 */
  type: 'light' | 'dark';
  /** CSS 变量 */
  cssVariables: Record<string, string>;
  /** CSS 内容 */
  cssContent: string;
  /** 组件样式 */
  componentStyles: Record<string, string>;
  /** 资源 */
  assets?: ThemeAssets;
}

/**
 * 主题资源
 */
export interface ThemeAssets {
  /** 背景图片 */
  backgroundImage?: string;
  /** 图标 */
  icons?: Record<string, string>;
}

// ============================================================================
// 日志类型
// ============================================================================

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志上下文
 */
export interface LogContext {
  /** 模块名 */
  module?: string;
  /** 操作名 */
  action?: string;
  /** 用户 ID */
  userId?: string;
  /** 请求 ID */
  requestId?: string;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 日志条目
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 日志级别 */
  level: LogLevel;
  /** 消息 */
  message: string;
  /** 上下文 */
  context?: LogContext;
  /** 错误信息 */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================================================
// 配置类型
// ============================================================================

/**
 * 配置作用域
 */
export type ConfigScope = 'default' | 'system' | 'user' | 'runtime';

/**
 * 配置变更回调
 */
export type ConfigChangeCallback = (
  newValue: unknown,
  oldValue: unknown,
  key: string
) => void;

// ============================================================================
// 多语言类型
// ============================================================================

/**
 * 支持的语言
 */
export type SupportedLanguage = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR';

/**
 * 语言翻译映射
 */
export type LanguageTranslations = Partial<Record<SupportedLanguage, string>>;

/**
 * 词汇表数据
 */
export interface VocabularyData {
  /** 版本 */
  version: string;
  /** 词汇映射 */
  vocabulary: Record<string, LanguageTranslations>;
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 深层只读
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 深层部分
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 可能为空
 */
export type Nullable<T> = T | null;

/**
 * 异步函数类型
 */
export type AsyncFunction<T = void, P extends unknown[] = unknown[]> = (
  ...args: P
) => Promise<T>;
