/**
 * BoxRenderer 箱子渲染器
 * @module @chips/foundation/renderer/box-renderer/box-renderer
 *
 * 负责解析 .box 文件并渲染为布局视图
 */

import type { BoxMetadata, BoxStructure, BoxCardEntry, BoxId, LayoutConfig } from '../../core/types';
import { IFrameWrapper } from '../../ui/iframe-wrapper/iframe-wrapper';
import { themeEngine } from '../theme-engine/theme-engine';

/**
 * 箱子渲染选项
 */
export interface BoxRenderOptions {
  /** 箱子ID */
  boxId: BoxId;
  /** 容器ID */
  containerId: string;
  /** 主题ID */
  themeId?: string;
  /** 布局配置覆盖 */
  layoutConfig?: Partial<LayoutConfig>;
}

/**
 * 箱子渲染结果
 */
export interface BoxRenderResult {
  /** iframe 包装器 */
  frame: IFrameWrapper;
  /** 元数据 */
  metadata: BoxMetadata;
  /** 成功状态 */
  success: boolean;
}

/**
 * 箱子数据
 */
export interface BoxData {
  /** 元数据 */
  metadata: BoxMetadata;
  /** 结构 */
  structure: BoxStructure;
}

/**
 * 布局插件接口
 */
export interface LayoutPlugin {
  /** 布局类型 */
  readonly type: string;
  /** 渲染布局 */
  render(cards: BoxCardEntry[], config: LayoutConfig): string;
  /** 获取 CSS */
  getCSS(): string;
}

/**
 * BoxRenderer 箱子渲染器
 */
export class BoxRenderer {
  private layouts: Map<string, LayoutPlugin> = new Map();

  /**
   * 注册布局插件
   */
  registerLayout(plugin: LayoutPlugin): void {
    this.layouts.set(plugin.type, plugin);
  }

  /**
   * 渲染箱子
   */
  async render(
    boxData: BoxData,
    options: BoxRenderOptions
  ): Promise<BoxRenderResult> {
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
    const html = this.generateHTML(boxData, options);

    // 加载 HTML
    frame.loadHTML(html);

    return {
      frame,
      metadata: boxData.metadata,
      success: true,
    };
  }

  /**
   * 生成 HTML
   */
  private generateHTML(boxData: BoxData, options: BoxRenderOptions): string {
    const { metadata, structure } = boxData;

    // 合并布局配置
    const layoutConfig: LayoutConfig = {
      ...structure.layout_config,
      ...options.layoutConfig,
    };

    // 获取布局插件
    const layoutPlugin = this.layouts.get(layoutConfig.layout_type);

    // 生成卡片列表 HTML
    const cardsHtml = layoutPlugin
      ? layoutPlugin.render(structure.cards, layoutConfig)
      : this.renderDefaultLayout(structure.cards);

    // 生成主题 CSS
    const themeCSS = options.themeId
      ? themeEngine.generateThemeCSS(options.themeId)
      : this.getDefaultCSS();

    // 获取布局 CSS
    const layoutCSS = layoutPlugin?.getCSS() ?? '';

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
    ${layoutCSS}
  </style>
</head>
<body>
  <div class="box-container" data-box-id="${metadata.id}">
    ${cardsHtml}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * 默认布局渲染
   */
  private renderDefaultLayout(cards: BoxCardEntry[]): string {
    return cards
      .map(
        (card) => `
        <div class="card-item" data-card-id="${card.id}" data-location="${card.location}">
          <div class="card-placeholder">
            ${card.metadata?.name ?? card.id}
          </div>
        </div>
      `
      )
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
      }
      .box-container {
        padding: 16px;
      }
      .card-item {
        margin-bottom: 16px;
      }
      .card-placeholder {
        padding: 40px;
        background: #f5f5f5;
        border-radius: 8px;
        text-align: center;
        color: #999;
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
 * 全局箱子渲染器实例
 */
export const boxRenderer = new BoxRenderer();
