/**
 * ThemeManager 主题管理器模块
 * @module @chips/foundation/renderer/theme-manager
 *
 * 负责整个薯片生态的主题登记、存储和分发
 *
 * @example
 * ```typescript
 * import {
 *   ThemeManager,
 *   createThemeManager,
 *   ThemeInfo,
 *   ThemePackage,
 *   DEFAULT_THEME_ID,
 * } from '@chips/foundation/renderer/theme-manager';
 *
 * // 创建主题管理器
 * const manager = createThemeManager(fileSystem);
 *
 * // 初始化
 * await manager.initialize('/path/to/themes');
 *
 * // 获取所有主题
 * const themes = manager.getAllThemes();
 *
 * // 获取默认主题
 * const defaultTheme = manager.getDefaultTheme();
 *
 * // 安装主题
 * const themeId = await manager.storeTheme(themeData);
 * ```
 */

// 类型导出
export {
  // 错误码
  ThemeErrorCodes,
  type ThemeErrorCode,
  // 国际化 key
  ThemeI18nKeys,
  // 主题类型
  type ThemeType,
  type ThemeInfo,
  type ThemePackage,
  type ThemeAsset,
  type ThemeConfigFile,
  type ThemeFilter,
  type ThemeInstallSource,
  type ThemeRegisterResult,
  type ThemeUnregisterResult,
  type ThemeStoreResult,
  type IThemeManager,
  // 默认主题常量
  DEFAULT_THEME_ID,
  DEFAULT_THEME_INFO,
} from './types';

// 主类导出
export {
  ThemeManager,
  type ThemeManagerOptions,
  type ThemeFileSystemAdapter,
  createThemeManager,
} from './theme-manager';
