/**
 * ThemeEngine 主题引擎
 * @module @chips/foundation/renderer/theme-engine/theme-engine
 */

import type { Theme, ThemeHierarchyConfig } from '../../core/types';

/**
 * 主题加载选项
 */
export interface ThemeLoadOptions {
  /** 主题ID */
  themeId: string;
  /** 是否缓存 */
  cache?: boolean;
}

/**
 * ThemeEngine 主题引擎
 */
export class ThemeEngine {
  private themes: Map<string, Theme> = new Map();
  private activeTheme: string | null = null;
  private cssVariables: Map<string, string> = new Map();

  /**
   * 注册主题
   */
  registerTheme(theme: Theme): void {
    this.themes.set(theme.id, theme);
  }

  /**
   * 获取主题
   */
  getTheme(themeId: string): Theme | undefined {
    return this.themes.get(themeId);
  }

  /**
   * 获取所有主题
   */
  getAllThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * 应用主题
   */
  applyTheme(themeId: string, element?: HTMLElement): void {
    const theme = this.themes.get(themeId);
    if (!theme) {
      throw new Error(`Theme not found: ${themeId}`);
    }

    const target = element ?? document.documentElement;

    // 应用 CSS 变量
    for (const [key, value] of Object.entries(theme.cssVariables)) {
      target.style.setProperty(`--${key}`, value);
      this.cssVariables.set(key, value);
    }

    // 添加主题类名
    target.classList.add(`theme-${theme.type}`);
    target.setAttribute('data-theme', theme.id);

    this.activeTheme = themeId;
  }

  /**
   * 获取当前主题
   */
  getActiveTheme(): string | null {
    return this.activeTheme;
  }

  /**
   * 解析主题层级
   */
  resolveThemeHierarchy(config: ThemeHierarchyConfig): Theme | undefined {
    // 优先级：组件级 > 卡片级 > 应用级 > 全局
    const themeId =
      config.componentTheme ??
      config.cardTheme ??
      config.appTheme ??
      config.globalTheme;

    if (!themeId) {
      return undefined;
    }

    return this.themes.get(themeId);
  }

  /**
   * 生成主题 CSS
   */
  generateThemeCSS(themeId: string): string {
    const theme = this.themes.get(themeId);
    if (!theme) {
      return '';
    }

    const variables = Object.entries(theme.cssVariables)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join('\n');

    return `:root {\n${variables}\n}\n\n${theme.cssContent}`;
  }

  /**
   * 获取 CSS 变量值
   */
  getCSSVariable(name: string): string | undefined {
    return this.cssVariables.get(name);
  }

  /**
   * 创建默认主题
   */
  createDefaultTheme(): Theme {
    return {
      id: 'chipshub:default',
      name: 'Default Theme',
      version: '1.0.0',
      type: 'light',
      cssVariables: {
        'color-primary': '#1890ff',
        'color-secondary': '#52c41a',
        'color-background': '#ffffff',
        'color-text': '#333333',
        'color-text-secondary': '#666666',
        'color-border': '#d9d9d9',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        'font-size-base': '14px',
        'border-radius': '4px',
        'shadow-base': '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
      cssContent: '',
      componentStyles: {},
    };
  }

  /**
   * 创建暗色主题
   */
  createDarkTheme(): Theme {
    return {
      id: 'chipshub:dark',
      name: 'Dark Theme',
      version: '1.0.0',
      type: 'dark',
      cssVariables: {
        'color-primary': '#177ddc',
        'color-secondary': '#49aa19',
        'color-background': '#141414',
        'color-text': '#f0f0f0',
        'color-text-secondary': '#a6a6a6',
        'color-border': '#434343',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        'font-size-base': '14px',
        'border-radius': '4px',
        'shadow-base': '0 2px 8px rgba(0, 0, 0, 0.45)',
      },
      cssContent: '',
      componentStyles: {},
    };
  }
}

/**
 * 全局主题引擎实例
 */
export const themeEngine = new ThemeEngine();
