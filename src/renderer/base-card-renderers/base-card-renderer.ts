/**
 * BaseCardRenderer 基础卡片渲染器基类
 * @module @chips/foundation/renderer/base-card-renderers/base-card-renderer
 */

import type { BaseCardConfig, BaseCardId } from '../../core/types';

/**
 * 渲染结果
 */
export interface BaseCardRenderResult {
  /** HTML 内容 */
  html: string;
  /** CSS 内容 */
  css?: string;
  /** JavaScript 内容 */
  js?: string;
  /** 渲染高度 */
  height?: number;
}

/**
 * 渲染上下文
 */
export interface RenderContext {
  /** 卡片ID */
  cardId: BaseCardId;
  /** 主题ID */
  themeId?: string;
  /** 渲染模式 */
  mode: 'view' | 'edit' | 'preview';
  /** 容器宽度 */
  containerWidth?: number;
}

/**
 * BaseCardRenderer 基础卡片渲染器抽象类
 */
export abstract class BaseCardRenderer<T = unknown> {
  /** 渲染器类型 */
  abstract readonly type: string;
  /** 支持的卡片类型 */
  abstract readonly supportedTypes: string[];

  /**
   * 检查是否支持该卡片类型
   */
  supports(cardType: string): boolean {
    return this.supportedTypes.includes(cardType);
  }

  /**
   * 渲染卡片
   */
  abstract render(config: BaseCardConfig<T>, context: RenderContext): BaseCardRenderResult;

  /**
   * 获取默认样式
   */
  getDefaultCSS(): string {
    return '';
  }

  /**
   * 获取默认脚本
   */
  getDefaultJS(): string {
    return '';
  }

  /**
   * 包装HTML
   */
  protected wrapHtml(content: string, className: string): string {
    return `<div class="base-card ${className}">${content}</div>`;
  }

  /**
   * 转义HTML
   */
  protected escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

/**
 * 渲染器注册表
 */
export class BaseCardRendererRegistry {
  private renderers: Map<string, BaseCardRenderer> = new Map();

  /**
   * 注册渲染器
   */
  register(renderer: BaseCardRenderer): void {
    for (const type of renderer.supportedTypes) {
      this.renderers.set(type, renderer);
    }
  }

  /**
   * 获取渲染器
   */
  get(cardType: string): BaseCardRenderer | undefined {
    return this.renderers.get(cardType);
  }

  /**
   * 获取所有支持的类型
   */
  getSupportedTypes(): string[] {
    return Array.from(this.renderers.keys());
  }
}

/**
 * 全局渲染器注册表
 */
export const baseCardRendererRegistry = new BaseCardRendererRegistry();
