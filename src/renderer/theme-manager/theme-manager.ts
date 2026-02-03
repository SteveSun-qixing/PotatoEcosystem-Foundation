/**
 * ThemeManager 全局主题管理器
 * @module @chips/foundation/renderer/theme-manager/theme-manager
 *
 * 负责整个薯片生态的主题登记、存储和分发
 */

import { ChipsError, ErrorCodes } from '../../core/errors';
import { ZIPProcessor } from '../../file/zip-processor/zip-processor';
import { YAMLParser } from '../../system/data-serializer/parsers/yaml-parser';
import {
  IThemeManager,
  ThemeInfo,
  ThemePackage,
  ThemeFilter,
  ThemeRegisterResult,
  ThemeUnregisterResult,
  ThemeConfigFile,
  ThemeAsset,
  DEFAULT_THEME_ID,
  DEFAULT_THEME_INFO,
} from './types';

// ============================================================================
// 文件系统接口
// ============================================================================

/**
 * 文件系统适配器接口
 */
export interface ThemeFileSystemAdapter {
  /** 读取文件 */
  readFile(path: string): Promise<Uint8Array>;
  /** 写入文件 */
  writeFile(path: string, data: Uint8Array): Promise<void>;
  /** 读取文本文件 */
  readTextFile(path: string): Promise<string>;
  /** 写入文本文件 */
  writeTextFile(path: string, content: string): Promise<void>;
  /** 读取目录 */
  readDir(path: string): Promise<string[]>;
  /** 创建目录 */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** 检查路径是否存在 */
  exists(path: string): Promise<boolean>;
  /** 检查是否为目录 */
  isDirectory(path: string): Promise<boolean>;
  /** 删除目录 */
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  /** 删除文件 */
  unlink(path: string): Promise<void>;
  /** 路径拼接 */
  join(...paths: string[]): string;
  /** 获取目录名 */
  dirname(path: string): string;
  /** 获取文件名 */
  basename(path: string): string;
}

// ============================================================================
// ThemeManager 实现
// ============================================================================

/**
 * ThemeManager 全局主题管理器
 *
 * @description
 * 主题管理器采用注册表模式管理主题。系统启动时扫描主题目录，
 * 读取每个主题包的配置文件，将主题信息加载到内存中的注册表。
 *
 * 主题目录结构按发行商组织，路径格式为 themes/{publisher}/{theme-name}/。
 * 每个主题包目录包含 theme.yaml 配置文件、styles/ 样式文件夹和
 * 可选的 assets/ 资源文件夹。
 *
 * @example
 * ```typescript
 * const manager = new ThemeManager(fileSystem, zipProcessor);
 *
 * // 初始化
 * await manager.initialize('/path/to/themes');
 *
 * // 获取所有主题
 * const themes = manager.getAllThemes();
 *
 * // 获取特定主题
 * const theme = manager.getTheme('薯片官方:默认主题');
 *
 * // 获取主题样式
 * const styles = await manager.getThemeStyles('薯片官方:默认主题', 'video-card');
 * ```
 */
export class ThemeManager implements IThemeManager {
  /** 主题注册表 */
  private registry: Map<string, ThemePackage> = new Map();
  /** 主题根目录 */
  private themesDir: string = '';
  /** 默认主题目录 */
  private defaultThemeDir: string = '';
  /** 是否已初始化 */
  private initialized: boolean = false;
  /** 文件系统适配器 */
  private fs: ThemeFileSystemAdapter;
  /** ZIP 处理器 */
  private zipProcessor: ZIPProcessor;
  /** YAML 解析器 */
  private yamlParser: YAMLParser;

  /**
   * 创建主题管理器实例
   * @param fileSystem - 文件系统适配器
   * @param zipProcessor - ZIP 处理器实例
   */
  constructor(fileSystem: ThemeFileSystemAdapter, zipProcessor?: ZIPProcessor) {
    this.fs = fileSystem;
    this.zipProcessor = zipProcessor || new ZIPProcessor();
    this.yamlParser = new YAMLParser();
  }

  /**
   * 初始化主题管理器
   *
   * @description
   * 扫描主题目录，读取每个主题包的配置文件，建立主题注册表。
   *
   * @param themesDir - 主题存储目录
   */
  async initialize(themesDir: string): Promise<void> {
    this.themesDir = themesDir;

    // 确保目录存在
    if (!(await this.fs.exists(themesDir))) {
      await this.fs.mkdir(themesDir, { recursive: true });
    }

    // 注册默认主题
    await this.registerDefaultTheme();

    // 扫描并注册用户主题
    await this.scanThemesDirectory();

    this.initialized = true;
  }

  /**
   * 获取所有已注册主题
   *
   * @param filter - 过滤条件
   * @returns 主题信息数组
   */
  getAllThemes(filter?: ThemeFilter): ThemeInfo[] {
    this.ensureInitialized();

    let themes = Array.from(this.registry.values());

    // 应用过滤条件
    if (filter) {
      if (filter.publisher) {
        themes = themes.filter((t) => t.publisher === filter.publisher);
      }
      if (filter.componentType) {
        themes = themes.filter(
          (t) =>
            t.supportedComponents.includes('*') ||
            t.supportedComponents.includes(filter.componentType!)
        );
      }
      if (filter.type) {
        themes = themes.filter((t) => t.type === filter.type);
      }
      if (filter.includeSystem === false) {
        themes = themes.filter((t) => !t.isSystem);
      }
    }

    // 转换为 ThemeInfo
    return themes.map((t) => this.toThemeInfo(t));
  }

  /**
   * 注册主题
   *
   * @param theme - 主题包配置
   * @returns 注册结果
   */
  async registerTheme(theme: ThemePackage): Promise<ThemeRegisterResult> {
    this.ensureInitialized();

    // 验证主题配置
    this.validateThemePackage(theme);

    // 检查是否已存在
    const existing = this.registry.get(theme.id);
    const isUpdate = !!existing;

    // 如果是更新，检查版本
    if (existing && !this.isNewerVersion(theme.version, existing.version)) {
      return {
        success: false,
        themeId: theme.id,
        message: 'Theme version is not newer than existing version',
        isUpdate: true,
      };
    }

    // 注册主题
    this.registry.set(theme.id, theme);

    return {
      success: true,
      themeId: theme.id,
      message: isUpdate ? 'Theme updated successfully' : 'Theme registered successfully',
      isUpdate,
    };
  }

  /**
   * 卸载主题
   *
   * @param themeId - 主题 ID
   * @returns 卸载结果
   */
  async unregisterTheme(themeId: string): Promise<ThemeUnregisterResult> {
    this.ensureInitialized();

    const theme = this.registry.get(themeId);

    // 检查主题是否存在
    if (!theme) {
      return {
        success: false,
        themeId,
        message: 'Theme not found',
      };
    }

    // 系统主题不能卸载
    if (theme.isSystem) {
      return {
        success: false,
        themeId,
        message: 'Cannot unregister system theme',
      };
    }

    // 从注册表移除
    this.registry.delete(themeId);

    // 删除主题文件
    if (theme.storagePath && (await this.fs.exists(theme.storagePath))) {
      try {
        await this.fs.rmdir(theme.storagePath, { recursive: true });
      } catch (error) {
        // 文件删除失败不影响注册表操作
        console.warn(`Failed to delete theme files: ${error}`);
      }
    }

    return {
      success: true,
      themeId,
      message: 'Theme unregistered successfully',
    };
  }

  /**
   * 获取主题详情
   *
   * @param themeId - 主题 ID
   * @returns 主题包配置，不存在则返回 null
   */
  getTheme(themeId: string): ThemePackage | null {
    this.ensureInitialized();
    return this.registry.get(themeId) || null;
  }

  /**
   * 获取默认主题
   *
   * @returns 默认主题信息
   */
  getDefaultTheme(): ThemeInfo {
    this.ensureInitialized();

    const defaultTheme = this.registry.get(DEFAULT_THEME_ID);
    if (defaultTheme) {
      return this.toThemeInfo(defaultTheme);
    }

    // 返回硬编码的默认主题信息
    return DEFAULT_THEME_INFO;
  }

  /**
   * 存储主题数据
   *
   * @description
   * 将主题压缩包解压到目标目录，读取配置并注册主题。
   *
   * @param themeData - 主题压缩包数据
   * @param targetDir - 目标目录（可选，默认为主题目录）
   * @returns 主题 ID
   */
  async storeTheme(themeData: Uint8Array, targetDir?: string): Promise<string> {
    this.ensureInitialized();

    // 验证 ZIP 格式
    const isValid = await this.zipProcessor.validate(themeData);
    if (!isValid) {
      throw new ChipsError(
        ErrorCodes.INVALID_FILE_FORMAT,
        'Invalid theme package format',
        { reason: 'Not a valid ZIP file' }
      );
    }

    // 提取 theme.yaml 配置
    let configContent: string;
    try {
      configContent = await this.zipProcessor.extractText(themeData, 'theme.yaml');
    } catch {
      throw new ChipsError(
        ErrorCodes.INVALID_FILE_FORMAT,
        'Invalid theme package: missing theme.yaml',
        {}
      );
    }

    // 解析配置
    const config = this.yamlParser.parse<ThemeConfigFile>(configContent);
    this.validateThemeConfig(config);

    // 确定目标路径
    const themePath = targetDir || this.fs.join(this.themesDir, config.publisher, config.id.split(':')[1] || config.name);

    // 确保目录存在
    if (!(await this.fs.exists(themePath))) {
      await this.fs.mkdir(themePath, { recursive: true });
    }

    // 解压文件
    const files = await this.zipProcessor.extract(themeData);
    for (const [filePath, content] of files) {
      const fullPath = this.fs.join(themePath, filePath);
      const dir = this.fs.dirname(fullPath);

      if (!(await this.fs.exists(dir))) {
        await this.fs.mkdir(dir, { recursive: true });
      }

      await this.fs.writeFile(fullPath, content);
    }

    // 加载并注册主题
    const theme = await this.loadThemeFromDirectory(themePath);
    if (theme) {
      await this.registerTheme(theme);
      return theme.id;
    }

    throw new ChipsError(
      ErrorCodes.MODULE_LOAD_ERROR,
      'Failed to load theme after extraction',
      { path: themePath }
    );
  }

  /**
   * 获取主题样式内容
   *
   * @param themeId - 主题 ID
   * @param componentType - 可选的组件类型
   * @returns CSS 样式内容
   */
  async getThemeStyles(themeId: string, componentType?: string): Promise<string> {
    this.ensureInitialized();

    const theme = this.registry.get(themeId);
    if (!theme) {
      // 回退到默认主题
      const defaultTheme = this.registry.get(DEFAULT_THEME_ID);
      if (!defaultTheme) {
        return '';
      }
      return this.getThemeStylesInternal(defaultTheme, componentType);
    }

    return this.getThemeStylesInternal(theme, componentType);
  }

  /**
   * 解析主题资源路径
   *
   * @param themeId - 主题 ID
   * @param relativePath - 相对路径
   * @returns 绝对文件路径，如果主题不存在或路径无效则返回 null
   */
  resolveAssetPath(themeId: string, relativePath: string): string | null {
    this.ensureInitialized();

    const theme = this.registry.get(themeId);
    if (!theme || !theme.storagePath) {
      return null;
    }

    // 安全检查：防止路径穿越
    const resolvedPath = this.fs.join(theme.storagePath, 'assets', relativePath);

    // 验证解析后的路径仍在主题目录内
    if (!resolvedPath.startsWith(theme.storagePath)) {
      return null;
    }

    return resolvedPath;
  }

  /**
   * 刷新主题注册表
   */
  async refresh(): Promise<void> {
    this.ensureInitialized();

    // 保留系统主题
    const systemThemes = Array.from(this.registry.entries()).filter(
      ([, theme]) => theme.isSystem
    );

    // 清空注册表
    this.registry.clear();

    // 重新添加系统主题
    for (const [id, theme] of systemThemes) {
      this.registry.set(id, theme);
    }

    // 重新扫描
    await this.scanThemesDirectory();
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ChipsError(
        ErrorCodes.MODULE_INIT_ERROR,
        'ThemeManager not initialized. Call initialize() first.',
        {}
      );
    }
  }

  /**
   * 注册默认主题
   */
  private async registerDefaultTheme(): Promise<void> {
    const defaultTheme: ThemePackage = {
      id: DEFAULT_THEME_ID,
      name: '默认主题',
      version: '1.0.0',
      publisher: '薯片官方',
      description: '薯片生态默认主题，提供简洁、通用的视觉风格',
      type: 'light',
      isSystem: true,
      storagePath: this.defaultThemeDir,
      supportedComponents: ['*'],
      cssVariables: this.getDefaultCssVariables(),
      componentStyles: {},
      assets: [],
    };

    this.registry.set(DEFAULT_THEME_ID, defaultTheme);
  }

  /**
   * 获取默认 CSS 变量
   */
  private getDefaultCssVariables(): Record<string, string> {
    return {
      // 颜色
      '--color-primary': '#3b82f6',
      '--color-primary-hover': '#2563eb',
      '--color-secondary': '#64748b',
      '--color-background': '#ffffff',
      '--color-surface': '#f8fafc',
      '--color-text': '#1e293b',
      '--color-text-secondary': '#64748b',
      '--color-border': '#e2e8f0',
      '--color-error': '#ef4444',
      '--color-success': '#22c55e',
      '--color-warning': '#f59e0b',

      // 字体
      '--font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '--font-size-sm': '12px',
      '--font-size-base': '14px',
      '--font-size-lg': '16px',
      '--font-size-xl': '18px',

      // 间距
      '--spacing-xs': '4px',
      '--spacing-sm': '8px',
      '--spacing-md': '16px',
      '--spacing-lg': '24px',
      '--spacing-xl': '32px',

      // 圆角
      '--radius-sm': '4px',
      '--radius-md': '8px',
      '--radius-lg': '12px',
      '--radius-full': '9999px',

      // 阴影
      '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
      '--shadow-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
      '--shadow-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',

      // 过渡
      '--transition-fast': '150ms ease',
      '--transition-normal': '200ms ease',
      '--transition-slow': '300ms ease',
    };
  }

  /**
   * 扫描主题目录
   */
  private async scanThemesDirectory(): Promise<void> {
    if (!(await this.fs.exists(this.themesDir))) {
      return;
    }

    // 遍历发行商目录
    const publishers = await this.fs.readDir(this.themesDir);

    for (const publisher of publishers) {
      const publisherPath = this.fs.join(this.themesDir, publisher);

      if (!(await this.fs.isDirectory(publisherPath))) {
        continue;
      }

      // 遍历主题目录
      const themeNames = await this.fs.readDir(publisherPath);

      for (const themeName of themeNames) {
        const themePath = this.fs.join(publisherPath, themeName);

        if (!(await this.fs.isDirectory(themePath))) {
          continue;
        }

        // 加载主题
        try {
          const theme = await this.loadThemeFromDirectory(themePath);
          if (theme) {
            this.registry.set(theme.id, theme);
          }
        } catch (error) {
          // 记录错误但继续扫描
          console.warn(`Failed to load theme from ${themePath}:`, error);
        }
      }
    }
  }

  /**
   * 从目录加载主题
   */
  private async loadThemeFromDirectory(themePath: string): Promise<ThemePackage | null> {
    const configPath = this.fs.join(themePath, 'theme.yaml');

    if (!(await this.fs.exists(configPath))) {
      return null;
    }

    // 读取配置
    const configContent = await this.fs.readTextFile(configPath);
    const config = this.yamlParser.parse<ThemeConfigFile>(configContent);

    // 加载样式文件
    const stylesDir = this.fs.join(themePath, 'styles');
    const componentStyles: Record<string, string> = {};

    if (await this.fs.exists(stylesDir)) {
      const styleFiles = await this.fs.readDir(stylesDir);
      for (const file of styleFiles) {
        if (file.endsWith('.css')) {
          const stylePath = this.fs.join(stylesDir, file);
          const componentName = file.replace('.css', '');
          componentStyles[componentName] = await this.fs.readTextFile(stylePath);
        }
      }
    }

    // 扫描资源
    const assetsDir = this.fs.join(themePath, 'assets');
    const assets: ThemeAsset[] = [];

    if (await this.fs.exists(assetsDir)) {
      const assetFiles = await this.fs.readDir(assetsDir);
      for (const file of assetFiles) {
        assets.push({
          name: file,
          type: this.getAssetType(file),
          path: file,
        });
      }
    }

    // 构建主题包
    const theme: ThemePackage = {
      id: config.id,
      name: config.name,
      version: config.version,
      publisher: config.publisher,
      description: config.description,
      type: config.type || 'light',
      isSystem: false,
      storagePath: themePath,
      supportedComponents: config.supported_components || ['*'],
      cssVariables: config.css_variables || {},
      componentStyles,
      assets,
      thumbnail: config.thumbnail,
      metadata: config.metadata,
    };

    return theme;
  }

  /**
   * 获取资源类型
   */
  private getAssetType(filename: string): ThemeAsset['type'] {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg':
        return 'image';
      case 'ico':
        return 'icon';
      case 'ttf':
      case 'otf':
      case 'woff':
      case 'woff2':
        return 'font';
      default:
        return 'other';
    }
  }

  /**
   * 转换为 ThemeInfo
   */
  private toThemeInfo(theme: ThemePackage): ThemeInfo {
    return {
      id: theme.id,
      name: theme.name,
      version: theme.version,
      publisher: theme.publisher,
      description: theme.description,
      type: theme.type,
      isSystem: theme.isSystem,
      supportedComponents: theme.supportedComponents,
      thumbnail: theme.thumbnail,
    };
  }

  /**
   * 验证主题包配置
   */
  private validateThemePackage(theme: ThemePackage): void {
    if (!theme.id) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Theme id is required', {});
    }
    if (!theme.name) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Theme name is required', {});
    }
    if (!theme.version) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Theme version is required', {});
    }
    if (!theme.publisher) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Theme publisher is required', {});
    }
  }

  /**
   * 验证主题配置文件
   */
  private validateThemeConfig(config: ThemeConfigFile): void {
    if (!config.id) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Theme config: id is required', {});
    }
    if (!config.name) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Theme config: name is required', {});
    }
    if (!config.version) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Theme config: version is required', {});
    }
    if (!config.publisher) {
      throw new ChipsError(
        ErrorCodes.INVALID_INPUT,
        'Theme config: publisher is required',
        {}
      );
    }
  }

  /**
   * 比较版本号
   */
  private isNewerVersion(newVersion: string, existingVersion: string): boolean {
    const parseVersion = (v: string) => {
      const parts = v.split('.').map((p) => parseInt(p, 10) || 0);
      return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
    };

    const newV = parseVersion(newVersion);
    const existingV = parseVersion(existingVersion);

    if (newV.major !== existingV.major) return newV.major > existingV.major;
    if (newV.minor !== existingV.minor) return newV.minor > existingV.minor;
    return newV.patch > existingV.patch;
  }

  /**
   * 获取主题样式内容（内部方法）
   */
  private async getThemeStylesInternal(
    theme: ThemePackage,
    componentType?: string
  ): Promise<string> {
    let css = '';

    // 添加 CSS 变量
    css += ':root {\n';
    for (const [key, value] of Object.entries(theme.cssVariables)) {
      css += `  ${key}: ${value};\n`;
    }
    css += '}\n\n';

    // 添加组件样式
    if (componentType) {
      // 只返回特定组件的样式
      const componentCss = theme.componentStyles[componentType];
      if (componentCss) {
        css += componentCss;
      }
    } else {
      // 返回所有组件样式
      for (const [, componentCss] of Object.entries(theme.componentStyles)) {
        css += componentCss + '\n';
      }
    }

    return css;
  }
}

/**
 * 创建主题管理器实例
 */
export function createThemeManager(
  fileSystem: ThemeFileSystemAdapter,
  zipProcessor?: ZIPProcessor
): ThemeManager {
  return new ThemeManager(fileSystem, zipProcessor);
}
