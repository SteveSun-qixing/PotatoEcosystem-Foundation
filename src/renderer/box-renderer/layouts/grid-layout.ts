/**
 * GridLayout 网格布局
 * @module @chips/foundation/renderer/box-renderer/layouts/grid-layout
 */

import type { BoxCardEntry, LayoutConfig } from '../../../core/types';
import type { LayoutPlugin } from '../box-renderer';

/**
 * 网格布局配置
 */
export interface GridLayoutConfig extends LayoutConfig {
  layout_type: 'grid';
  /** 列数 */
  columns?: number;
  /** 间距 */
  gap?: number;
  /** 最小列宽 */
  minColumnWidth?: number;
}

/**
 * GridLayout 网格布局插件
 */
export class GridLayout implements LayoutPlugin {
  readonly type = 'grid';

  render(cards: BoxCardEntry[], config: LayoutConfig): string {
    const gridConfig = config as GridLayoutConfig;
    const columns = gridConfig.columns ?? 3;
    const gap = gridConfig.gap ?? 16;

    const style = `
      --grid-columns: ${columns};
      --grid-gap: ${gap}px;
      ${gridConfig.minColumnWidth ? `--min-column-width: ${gridConfig.minColumnWidth}px;` : ''}
    `;

    const items = cards
      .map(
        (card) => `
        <div class="grid-item" data-card-id="${card.id}">
          <div class="card-preview">
            <span class="card-name">${card.metadata?.name ?? card.id}</span>
          </div>
        </div>
      `
      )
      .join('\n');

    return `
      <div class="grid-layout" style="${style}">
        ${items}
      </div>
    `;
  }

  getCSS(): string {
    return `
      .grid-layout {
        display: grid;
        grid-template-columns: repeat(var(--grid-columns, 3), 1fr);
        gap: var(--grid-gap, 16px);
      }
      @media (max-width: 768px) {
        .grid-layout {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 480px) {
        .grid-layout {
          grid-template-columns: 1fr;
        }
      }
      .grid-item {
        aspect-ratio: 4 / 3;
      }
      .grid-item .card-preview {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-background, #f5f5f5);
        border: 1px solid var(--color-border, #e0e0e0);
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .grid-item .card-preview:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .card-name {
        font-weight: 500;
        text-align: center;
      }
    `;
  }
}

/**
 * 网格布局实例
 */
export const gridLayout = new GridLayout();
