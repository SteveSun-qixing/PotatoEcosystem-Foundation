/**
 * TextRenderer 文本类渲染器
 * @module @chips/foundation/renderer/base-card-renderers/renderers/text-renderer
 */

import type { BaseCardConfig } from '../../../core/types';
import {
  BaseCardRenderer,
  type BaseCardRenderResult,
  type RenderContext,
} from '../base-card-renderer';

/**
 * 富文本内容
 */
export interface RichTextContent {
  /** 内容 (HTML 或纯文本) */
  content: string;
  /** 是否为 HTML */
  isHtml?: boolean;
}

/**
 * Markdown 内容
 */
export interface MarkdownContent {
  /** Markdown 文本 */
  text: string;
}

/**
 * 代码内容
 */
export interface CodeContent {
  /** 代码文本 */
  code: string;
  /** 语言 */
  language: string;
  /** 是否显示行号 */
  showLineNumbers?: boolean;
}

/**
 * 富文本渲染器
 */
export class RichTextRenderer extends BaseCardRenderer<RichTextContent> {
  readonly type = 'rich-text';
  readonly supportedTypes = ['rich-text', 'text'];

  render(
    config: BaseCardConfig<RichTextContent>,
    _context: RenderContext
  ): BaseCardRenderResult {
    const content = config.content;
    let html: string;

    if (content.isHtml) {
      html = content.content;
    } else {
      html = `<p>${this.escapeHtml(content.content)}</p>`;
    }

    return {
      html: this.wrapHtml(html, 'rich-text-card'),
      css: this.getDefaultCSS(),
    };
  }

  override getDefaultCSS(): string {
    return `
      .rich-text-card {
        padding: 16px;
        line-height: 1.6;
      }
      .rich-text-card p {
        margin: 0 0 1em;
      }
      .rich-text-card p:last-child {
        margin-bottom: 0;
      }
    `;
  }
}

/**
 * Markdown 渲染器
 */
export class MarkdownRenderer extends BaseCardRenderer<MarkdownContent> {
  readonly type = 'markdown';
  readonly supportedTypes = ['markdown'];

  render(
    config: BaseCardConfig<MarkdownContent>,
    _context: RenderContext
  ): BaseCardRenderResult {
    const content = config.content;

    // 简化的 Markdown 渲染
    let html = this.escapeHtml(content.text);

    // 标题
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 加粗和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 行内代码
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // 段落
    html = html.replace(/^(?!<[a-z])(.+)$/gm, '<p>$1</p>');

    return {
      html: this.wrapHtml(html, 'markdown-card'),
      css: this.getDefaultCSS(),
    };
  }

  override getDefaultCSS(): string {
    return `
      .markdown-card {
        padding: 16px;
        line-height: 1.6;
      }
      .markdown-card h1, .markdown-card h2, .markdown-card h3 {
        margin: 1em 0 0.5em;
      }
      .markdown-card code {
        background: rgba(0,0,0,0.05);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: monospace;
      }
    `;
  }
}

/**
 * 代码渲染器
 */
export class CodeRenderer extends BaseCardRenderer<CodeContent> {
  readonly type = 'code';
  readonly supportedTypes = ['code'];

  render(
    config: BaseCardConfig<CodeContent>,
    _context: RenderContext
  ): BaseCardRenderResult {
    const content = config.content;
    const lines = content.code.split('\n');

    let codeHtml: string;

    if (content.showLineNumbers) {
      codeHtml = lines
        .map((line, i) => `<span class="line"><span class="line-num">${i + 1}</span>${this.escapeHtml(line)}</span>`)
        .join('\n');
    } else {
      codeHtml = this.escapeHtml(content.code);
    }

    const html = `
      <pre class="code-block" data-language="${content.language}">
        <code class="language-${content.language}">${codeHtml}</code>
      </pre>
    `;

    return {
      html: this.wrapHtml(html, 'code-card'),
      css: this.getDefaultCSS(),
    };
  }

  override getDefaultCSS(): string {
    return `
      .code-card {
        padding: 0;
      }
      .code-card pre {
        margin: 0;
        padding: 16px;
        background: #f5f5f5;
        overflow-x: auto;
        font-family: 'Fira Code', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.5;
      }
      .code-card .line {
        display: block;
      }
      .code-card .line-num {
        display: inline-block;
        width: 3em;
        text-align: right;
        margin-right: 1em;
        opacity: 0.5;
        user-select: none;
      }
    `;
  }
}

// 创建渲染器实例
export const richTextRenderer = new RichTextRenderer();
export const markdownRenderer = new MarkdownRenderer();
export const codeRenderer = new CodeRenderer();
