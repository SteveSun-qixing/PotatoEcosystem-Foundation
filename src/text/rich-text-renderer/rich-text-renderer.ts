/**
 * RichTextRenderer 富文本渲染器
 * @module @chips/foundation/text/rich-text-renderer/rich-text-renderer
 */

/**
 * 富文本节点类型
 */
export type RichTextNodeType =
  | 'paragraph'
  | 'heading'
  | 'text'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'link'
  | 'image'
  | 'list'
  | 'list-item'
  | 'code'
  | 'blockquote';

/**
 * 富文本节点
 */
export interface RichTextNode {
  /** 节点类型 */
  type: RichTextNodeType;
  /** 文本内容（文本节点） */
  text?: string;
  /** 子节点 */
  children?: RichTextNode[];
  /** 属性 */
  attributes?: Record<string, unknown>;
}

/**
 * 渲染选项
 */
export interface RenderOptions {
  /** CSS 类名前缀 */
  classPrefix?: string;
  /** 是否转义 HTML */
  escapeHtml?: boolean;
}

/**
 * RichTextRenderer 富文本渲染器
 */
export class RichTextRenderer {
  private classPrefix: string;

  constructor(options?: RenderOptions) {
    this.classPrefix = options?.classPrefix ?? 'rt';
  }

  /**
   * 渲染富文本
   */
  render(nodes: RichTextNode[], options?: RenderOptions): string {
    return nodes.map((node) => this.renderNode(node, options)).join('');
  }

  /**
   * 渲染单个节点
   */
  private renderNode(node: RichTextNode, options?: RenderOptions): string {
    const prefix = options?.classPrefix ?? this.classPrefix;

    switch (node.type) {
      case 'paragraph':
        return `<p class="${prefix}-paragraph">${this.renderChildren(node, options)}</p>`;

      case 'heading': {
        const level = (node.attributes?.['level'] as number) ?? 1;
        return `<h${level} class="${prefix}-heading">${this.renderChildren(node, options)}</h${level}>`;
      }

      case 'text':
        return this.escapeHtml(node.text ?? '');

      case 'bold':
        return `<strong class="${prefix}-bold">${this.renderChildren(node, options)}</strong>`;

      case 'italic':
        return `<em class="${prefix}-italic">${this.renderChildren(node, options)}</em>`;

      case 'underline':
        return `<u class="${prefix}-underline">${this.renderChildren(node, options)}</u>`;

      case 'strikethrough':
        return `<s class="${prefix}-strikethrough">${this.renderChildren(node, options)}</s>`;

      case 'link': {
        const href = (node.attributes?.['href'] as string) ?? '#';
        return `<a href="${this.escapeHtml(href)}" class="${prefix}-link">${this.renderChildren(node, options)}</a>`;
      }

      case 'image': {
        const src = (node.attributes?.['src'] as string) ?? '';
        const alt = (node.attributes?.['alt'] as string) ?? '';
        return `<img src="${this.escapeHtml(src)}" alt="${this.escapeHtml(alt)}" class="${prefix}-image">`;
      }

      case 'list': {
        const ordered = node.attributes?.['ordered'] as boolean;
        const tag = ordered ? 'ol' : 'ul';
        return `<${tag} class="${prefix}-list">${this.renderChildren(node, options)}</${tag}>`;
      }

      case 'list-item':
        return `<li class="${prefix}-list-item">${this.renderChildren(node, options)}</li>`;

      case 'code': {
        const language = (node.attributes?.['language'] as string) ?? '';
        return `<pre class="${prefix}-code"><code class="language-${language}">${this.escapeHtml(node.text ?? '')}</code></pre>`;
      }

      case 'blockquote':
        return `<blockquote class="${prefix}-blockquote">${this.renderChildren(node, options)}</blockquote>`;

      default:
        return this.renderChildren(node, options);
    }
  }

  /**
   * 渲染子节点
   */
  private renderChildren(node: RichTextNode, options?: RenderOptions): string {
    if (!node.children) {
      return node.text ? this.escapeHtml(node.text) : '';
    }
    return node.children.map((child) => this.renderNode(child, options)).join('');
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 从 HTML 解析（简化版）
   */
  parseHtml(html: string): RichTextNode[] {
    // 简化实现，实际应使用 DOM 解析
    return [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: html }],
      },
    ];
  }
}

/**
 * 全局富文本渲染器实例
 */
export const richTextRenderer = new RichTextRenderer();
