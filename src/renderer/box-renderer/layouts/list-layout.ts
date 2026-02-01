/**
 * ListLayout 列表布局
 * @module @chips/foundation/renderer/box-renderer/layouts/list-layout
 */

import type { BoxCardEntry, LayoutConfig } from '../../../core/types';
import type { LayoutPlugin } from '../box-renderer';

/**
 * 列表布局配置
 */
export interface ListLayoutConfig extends LayoutConfig {
  layout_type: 'list';
  /** 间距 */
  gap?: number;
  /** 方向 */
  direction?: 'vertical' | 'horizontal';
}

/**
 * ListLayout 列表布局插件
 */
export class ListLayout implements LayoutPlugin {
  readonly type = 'list';

  render(cards: BoxCardEntry[], config: LayoutConfig): string {
    const listConfig = config as ListLayoutConfig;
    const direction = listConfig.direction ?? 'vertical';

    const items = cards
      .map(
        (card) => `
        <div class="list-item" data-card-id="${card.id}">
          <div class="card-preview">
            <span class="card-name">${card.metadata?.name ?? card.id}</span>
          </div>
        </div>
      `
      )
      .join('\n');

    return `
      <div class="list-layout ${direction}">
        ${items}
      </div>
    `;
  }

  getCSS(): string {
    return `
      .list-layout {
        display: flex;
        flex-direction: column;
        gap: var(--layout-gap, 16px);
      }
      .list-layout.horizontal {
        flex-direction: row;
        overflow-x: auto;
      }
      .list-item {
        flex-shrink: 0;
      }
      .list-layout.horizontal .list-item {
        width: 300px;
      }
      .card-preview {
        padding: 20px;
        background: var(--color-background, #f5f5f5);
        border: 1px solid var(--color-border, #e0e0e0);
        border-radius: 8px;
        cursor: pointer;
        transition: box-shadow 0.2s;
      }
      .card-preview:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .card-name {
        font-weight: 500;
      }
    `;
  }
}

/**
 * 列表布局实例
 */
export const listLayout = new ListLayout();
