/**
 * ThemeEngine 主题引擎
 * @module @chips/foundation/renderer/theme-engine/theme-engine
 *
 * 负责主题的注册、注销、应用、层级解析和 CSS 生成。
 * 提供事件回调通知机制，支持浏览器和非浏览器环境。
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
 * 主题变更事件类型
 */
export type ThemeChangeEvent = 'registered' | 'unregistered' | 'applied';

/**
 * 主题事件回调
 */
export type ThemeEventHandler = (event: ThemeChangeEvent, themeId: string) => void;

/**
 * 检测是否在浏览器环境
 */
function isBrowser(): boolean {
  return typeof document !== 'undefined' && typeof document.documentElement !== 'undefined';
}

/**
 * ThemeEngine 主题引擎
 */
export class ThemeEngine {
  private themes: Map<string, Theme> = new Map();
  private activeTheme: string | null = null;
  private previousTheme: string | null = null;
  private cssVariables: Map<string, string> = new Map();
  private eventHandlers: Set<ThemeEventHandler> = new Set();

  /**
   * 注册主题
   */
  registerTheme(theme: Theme): void {
    this.themes.set(theme.id, theme);
    this._notifyEvent('registered', theme.id);
  }

  /**
   * 注销主题
   *
   * 如果被注销的主题是当前活跃主题，将自动回退到默认主题或清空活跃主题。
   */
  unregisterTheme(themeId: string): boolean {
    if (!this.themes.has(themeId)) {
      return false;
    }

    this.themes.delete(themeId);

    // 如果当前活跃主题被注销，回退
    if (this.activeTheme === themeId) {
      const defaultTheme = this.themes.get('chipshub:default');
      if (defaultTheme) {
        this.activeTheme = defaultTheme.id;
      } else {
        this.activeTheme = null;
      }
    }

    this._notifyEvent('unregistered', themeId);
    return true;
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
   *
   * 在浏览器环境中，会先清理旧主题的 CSS 变量和类名，再应用新主题。
   * 在非浏览器环境（Node.js/SSR）中，仅更新内部状态，不操作 DOM。
   *
   * @param themeId - 要应用的主题ID
   * @param element - 可选的目标 DOM 元素（默认为 document.documentElement）
   */
  applyTheme(themeId: string, element?: HTMLElement): void {
    const theme = this.themes.get(themeId);
    if (!theme) {
      throw new Error(`Theme not found: ${themeId}`);
    }

    // 保存旧主题ID
    this.previousTheme = this.activeTheme;

    if (isBrowser()) {
      const target = element ?? document.documentElement;

      // 1. 清理旧主题的 CSS 变量
      for (const key of this.cssVariables.keys()) {
        target.style.removeProperty(`--${key}`);
      }
      this.cssVariables.clear();

      // 2. 清理旧主题的类名
      if (this.previousTheme) {
        const previousThemeData = this.themes.get(this.previousTheme);
        if (previousThemeData) {
          target.classList.remove(`theme-${previousThemeData.type}`);
        }
      }
      // 额外兜底：移除所有可能的主题类名
      target.classList.remove('theme-light', 'theme-dark');

      // 3. 应用新主题 CSS 变量
      for (const [key, value] of Object.entries(theme.cssVariables)) {
        target.style.setProperty(`--${key}`, value);
        this.cssVariables.set(key, value);
      }

      // 4. 添加新主题类名
      target.classList.add(`theme-${theme.type}`);
      target.setAttribute('data-theme', theme.id);
    } else {
      // 非浏览器环境：仅更新内部 CSS 变量映射
      this.cssVariables.clear();
      for (const [key, value] of Object.entries(theme.cssVariables)) {
        this.cssVariables.set(key, value);
      }
    }

    this.activeTheme = themeId;
    this._notifyEvent('applied', themeId);
  }

  /**
   * 获取当前主题ID
   */
  getActiveTheme(): string | null {
    return this.activeTheme;
  }

  /**
   * 解析主题层级
   *
   * 按优先级解析：组件级 > 卡片级 > 应用级 > 全局
   */
  resolveThemeHierarchy(config: ThemeHierarchyConfig): Theme | undefined {
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
   * 注册事件回调
   */
  onThemeChange(handler: ThemeEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * 取消事件回调
   */
  offThemeChange(handler: ThemeEventHandler): void {
    this.eventHandlers.delete(handler);
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

  /**
   * 通知事件回调
   */
  private _notifyEvent(event: ThemeChangeEvent, themeId: string): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event, themeId);
      } catch (error) {
        console.error(`[ThemeEngine] Event handler error for ${event}:`, error);
      }
    }
  }
}

/**
 * 全局主题引擎实例
 */
export const themeEngine = new ThemeEngine();
