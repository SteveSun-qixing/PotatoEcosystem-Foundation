/**
 * ThemeManager 主题管理器类型定义
 * @module @chips/foundation/renderer/theme-manager/types
 */

// ============================================================================
// 错误码定义
// ============================================================================

/**
 * 主题管理器错误码
 * 遵循 Chips 生态错误码规范：THEME-xxxx
 */
export const ThemeErrorCodes = {
  /** 主题管理器未初始化 */
  NOT_INITIALIZED: 'THEME-1001',
  /** 无效的主题包格式 */
  INVALID_PACKAGE: 'THEME-1002',
  /** 主题配置缺失必需字段 */
  MISSING_CONFIG: 'THEME-1003',
  /** 主题未找到 */
  THEME_NOT_FOUND: 'THEME-1004',
  /** 无法卸载系统主题 */
  CANNOT_UNINSTALL_SYSTEM: 'THEME-1005',
  /** 版本冲突 */
  VERSION_CONFLICT: 'THEME-1006',
  /** 主题存储失败 */
  STORE_FAILED: 'THEME-1007',
  /** 主题加载失败 */
  LOAD_FAILED: 'THEME-1008',
  /** 资源路径无效 */
  INVALID_ASSET_PATH: 'THEME-1009',
  /** 主题验证失败 */
  VALIDATION_FAILED: 'THEME-1010',
} as const;

export type ThemeErrorCode = (typeof ThemeErrorCodes)[keyof typeof ThemeErrorCodes];

// ============================================================================
// 国际化词汇 key 定义
// ============================================================================

/**
 * 主题管理器国际化词汇 key
 * 开发阶段使用，打包时由系统替换为编码
 */
export const ThemeI18nKeys = {
  // 错误消息
  ERROR_NOT_INITIALIZED: 'theme.error.not_initialized',
  ERROR_INVALID_PACKAGE: 'theme.error.invalid_package',
  ERROR_MISSING_CONFIG: 'theme.error.missing_config',
  ERROR_THEME_NOT_FOUND: 'theme.error.theme_not_found',
  ERROR_CANNOT_UNINSTALL_SYSTEM: 'theme.error.cannot_uninstall_system',
  ERROR_VERSION_CONFLICT: 'theme.error.version_conflict',
  ERROR_STORE_FAILED: 'theme.error.store_failed',
  ERROR_LOAD_FAILED: 'theme.error.load_failed',
  ERROR_INVALID_ASSET_PATH: 'theme.error.invalid_asset_path',
  ERROR_VALIDATION_FAILED: 'theme.error.validation_failed',

  // 操作消息
  MSG_THEME_REGISTERED: 'theme.message.registered',
  MSG_THEME_UNREGISTERED: 'theme.message.unregistered',
  MSG_THEME_UPDATED: 'theme.message.updated',
  MSG_THEME_STORED: 'theme.message.stored',
  MSG_INITIALIZED: 'theme.message.initialized',

  // 默认主题
  DEFAULT_THEME_NAME: 'theme.default.name',
  DEFAULT_THEME_DESCRIPTION: 'theme.default.description',
} as const;

// ============================================================================
// 主题基础类型
// ============================================================================

/**
 * 主题类型
 */
export type ThemeType = 'light' | 'dark' | 'auto';

/**
 * 主题信息（摘要）
 */
export interface ThemeInfo {
  /** 主题 ID（格式：发行商:主题名） */
  id: string;
  /** 主题名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 发行商 */
  publisher: string;
  /** 描述 */
  description?: string;
  /** 主题类型 */
  type: ThemeType;
  /** 是否为系统主题 */
  isSystem: boolean;
  /** 支持的组件类型 */
  supportedComponents: string[];
  /** 缩略图路径 */
  thumbnail?: string;
}

/**
 * 主题包完整配置
 */
export interface ThemePackage {
  /** 主题 ID */
  id: string;
  /** 主题名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 发行商 */
  publisher: string;
  /** 描述 */
  description?: string;
  /** 主题类型 */
  type: ThemeType;
  /** 是否为系统主题 */
  isSystem: boolean;
  /** 存储路径 */
  storagePath: string;
  /** 支持的组件类型 */
  supportedComponents: string[];
  /** CSS 变量定义 */
  cssVariables: Record<string, string>;
  /** 组件样式映射 */
  componentStyles: Record<string, string>;
  /** 资源清单 */
  assets: ThemeAsset[];
  /** 缩略图路径 */
  thumbnail?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 主题资源
 */
export interface ThemeAsset {
  /** 资源名称 */
  name: string;
  /** 资源类型 */
  type: 'image' | 'icon' | 'font' | 'other';
  /** 相对路径 */
  path: string;
}

// ============================================================================
// 主题配置文件格式
// ============================================================================

/**
 * theme.yaml 配置文件格式
 */
export interface ThemeConfigFile {
  /** 主题 ID */
  id: string;
  /** 主题名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 发行商 */
  publisher: string;
  /** 描述 */
  description?: string;
  /** 主题类型 */
  type?: ThemeType;
  /** 支持的组件类型 */
  supported_components?: string[];
  /** CSS 变量 */
  css_variables?: Record<string, string>;
  /** 缩略图 */
  thumbnail?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 查询和过滤
// ============================================================================

/**
 * 主题过滤条件
 */
export interface ThemeFilter {
  /** 按发行商过滤 */
  publisher?: string;
  /** 按组件类型过滤 */
  componentType?: string;
  /** 按主题类型过滤 */
  type?: ThemeType;
  /** 是否包含系统主题 */
  includeSystem?: boolean;
}

/**
 * 主题安装源
 */
export interface ThemeInstallSource {
  /** 源类型 */
  type: 'file' | 'directory' | 'url';
  /** 路径或 URL */
  path: string;
}

// ============================================================================
// 操作结果
// ============================================================================

/**
 * 主题注册结果
 */
export interface ThemeRegisterResult {
  /** 是否成功 */
  success: boolean;
  /** 主题 ID */
  themeId: string;
  /** 操作消息 */
  message?: string;
  /** 是否为更新操作 */
  isUpdate?: boolean;
}

/**
 * 主题卸载结果
 */
export interface ThemeUnregisterResult {
  /** 是否成功 */
  success: boolean;
  /** 主题 ID */
  themeId: string;
  /** 操作消息 */
  message?: string;
}

/**
 * 主题存储结果
 */
export interface ThemeStoreResult {
  /** 是否成功 */
  success: boolean;
  /** 主题 ID */
  themeId: string;
  /** 存储路径 */
  storagePath: string;
}

// ============================================================================
// 接口定义
// ============================================================================

/**
 * 主题管理器接口
 */
export interface IThemeManager {
  /**
   * 初始化主题管理器
   * @param themesDir - 主题存储目录
   */
  initialize(themesDir: string): Promise<void>;

  /**
   * 获取所有已注册主题
   * @param filter - 过滤条件
   */
  getAllThemes(filter?: ThemeFilter): ThemeInfo[];

  /**
   * 注册主题
   * @param theme - 主题包配置
   */
  registerTheme(theme: ThemePackage): Promise<ThemeRegisterResult>;

  /**
   * 卸载主题
   * @param themeId - 主题 ID
   */
  unregisterTheme(themeId: string): Promise<ThemeUnregisterResult>;

  /**
   * 获取主题详情
   * @param themeId - 主题 ID
   */
  getTheme(themeId: string): ThemePackage | null;

  /**
   * 获取默认主题
   */
  getDefaultTheme(): ThemeInfo;

  /**
   * 存储主题数据
   * @param themeData - 主题压缩包数据
   * @param targetDir - 目标目录
   */
  storeTheme(themeData: Uint8Array, targetDir: string): Promise<string>;

  /**
   * 获取主题样式内容
   * @param themeId - 主题 ID
   * @param componentType - 可选的组件类型
   */
  getThemeStyles(themeId: string, componentType?: string): Promise<string>;

  /**
   * 解析主题资源路径
   * @param themeId - 主题 ID
   * @param relativePath - 相对路径
   */
  resolveAssetPath(themeId: string, relativePath: string): string | null;

  /**
   * 刷新主题注册表
   */
  refresh(): Promise<void>;
}

// ============================================================================
// 默认主题定义
// ============================================================================

/**
 * 默认主题 ID
 */
export const DEFAULT_THEME_ID = '薯片官方:默认主题';

/**
 * 默认主题信息
 */
export const DEFAULT_THEME_INFO: ThemeInfo = {
  id: DEFAULT_THEME_ID,
  name: '默认主题',
  version: '1.0.0',
  publisher: '薯片官方',
  description: '薯片生态默认主题，提供简洁、通用的视觉风格',
  type: 'light',
  isSystem: true,
  supportedComponents: ['*'],
};
