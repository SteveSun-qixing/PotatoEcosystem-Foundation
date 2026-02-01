/**
 * CardRenderer 卡片渲染器
 * @module @chips/foundation/renderer/card-renderer/card-renderer
 *
 * 负责解析 .card 文件并渲染为 iframe
 */

import type { CardMetadata, CardStructure, BaseCardEntry, CardId } from '../../core/types';
import { baseCardRendererRegistry, type RenderContext } from '../base-card-renderers/base-card-renderer';
import { themeEngine } from '../theme-engine/theme-engine';
import { IFrameWrapper } from '../../ui/iframe-wrapper/iframe-wrapper';

/**
 * 卡片渲染选项
 */
export interface CardRenderOptions {
  /** 卡片ID */
  cardId: CardId;
  /** 容器ID */
  containerId: string;
  /** 主题ID */
  themeId?: string;
  /** 渲染模式 */
  mode?: 'view' | 'edit' | 'preview';
  /** 自适应高度 */
  autoHeight?: boolean;
}

/**
 * 卡片渲染结果
 */
export interface CardRenderResult {
  /** iframe 包装器 */
  frame: IFrameWrapper;
  /** 元数据 */
  metadata: CardMetadata;
  /** 成功状态 */
  success: boolean;
}

/**
 * 卡片数据
 */
export interface CardData {
  /** 元数据 */
  metadata: CardMetadata;
  /** 结构 */
  structure: CardStructure;
  /** 基础卡片配置映射 */
  baseCards: Map<string, unknown>;
}

/**
 * CardRenderer 卡片渲染器
 */
export class CardRenderer {
  /**
   * 渲染卡片
   */
  async render(
    cardData: CardData,
    options: CardRenderOptions
  ): Promise<CardRenderResult> {
    const container = document.getElementById(options.containerId);
    if (!container) {
      throw new Error(`Container not found: ${options.containerId}`);
    }

    // 创建 iframe 包装器
    const frame = new IFrameWrapper({
      container,
      sandbox: ['allow-scripts', 'allow-same-origin'],
    });

    // 生成 HTML 内容
    const html = this.generateHTML(cardData, options);

    // 加载 HTML
    frame.loadHTML(html);

    return {
      frame,
      metadata: cardData.metadata,
      success: true,
    };
  }

  /**
   * 生成 HTML
   */
  private generateHTML(cardData: CardData, options: CardRenderOptions): string {
    const { metadata, structure } = cardData;

    // 生成基础卡片 HTML
    const cardsHtml = this.renderBaseCards(structure.base_cards, cardData.baseCards, {
      cardId: options.cardId as never,
      themeId: options.themeId,
      mode: options.mode ?? 'view',
    });

    // 生成主题 CSS
    const themeCSS = options.themeId
      ? themeEngine.generateThemeCSS(options.themeId)
      : this.getDefaultCSS();

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(metadata.name)}</title>
  <style>
    ${this.getBaseCSS()}
    ${themeCSS}
  </style>
</head>
<body>
  <div class="card-container" data-card-id="${metadata.id}">
    ${cardsHtml}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 渲染基础卡片列表
   */
  private renderBaseCards(
    entries: BaseCardEntry[],
    configs: Map<string, unknown>,
    context: RenderContext
  ): string {
    const sortedEntries = [...entries].sort((a, b) => a.order - b.order);

    return sortedEntries
      .map((entry) => {
        const config = configs.get(entry.id);
        if (!config) {
          return `<!-- Missing config for ${entry.id} -->`;
        }

        const renderer = baseCardRendererRegistry.get(entry.type);
        if (!renderer) {
          return `<!-- No renderer for type ${entry.type} -->`;
        }

        try {
          const result = renderer.render(config as never, context);
          return `
            <div class="base-card-wrapper" data-base-card-id="${entry.id}" data-type="${entry.type}">
              <style>${result.css ?? ''}</style>
              ${result.html}
            </div>
          `;
        } catch (error) {
          return `<!-- Render error: ${(error as Error).message} -->`;
        }
      })
      .join('\n');
  }

  /**
   * 获取基础 CSS
   */
  private getBaseCSS(): string {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        font-size: var(--font-size-base, 14px);
        color: var(--color-text, #333);
        background: var(--color-background, #fff);
        line-height: 1.5;
      }
      .card-container {
        padding: 16px;
      }
      .base-card-wrapper {
        margin-bottom: 16px;
      }
      .base-card-wrapper:last-child {
        margin-bottom: 0;
      }
    `;
  }

  /**
   * 获取默认主题 CSS
   */
  private getDefaultCSS(): string {
    return `
      :root {
        --color-primary: #1890ff;
        --color-background: #ffffff;
        --color-text: #333333;
        --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --font-size-base: 14px;
      }
    `;
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

/**
 * 全局卡片渲染器实例
 */
export const cardRenderer = new CardRenderer();
