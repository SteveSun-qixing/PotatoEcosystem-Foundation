/**
 * MarkdownParser Markdown解析器
 * @module @chips/foundation/text/markdown-parser/markdown-parser
 *
 * 提供 Markdown 到 HTML 的转换
 * 实际项目中应集成 marked
 */

/**
 * 解析选项
 */
export interface MarkdownOptions {
  /** 是否生成目录 */
  toc?: boolean;
  /** 是否启用 GFM */
  gfm?: boolean;
  /** 是否允许 HTML */
  allowHtml?: boolean;
  /** 代码高亮函数 */
  highlight?: (code: string, language: string) => string;
}

/**
 * 目录项
 */
export interface TocItem {
  /** 级别 (1-6) */
  level: number;
  /** 标题文本 */
  text: string;
  /** 锚点ID */
  id: string;
}

/**
 * 解析结果
 */
export interface MarkdownResult {
  /** HTML 内容 */
  html: string;
  /** 目录 */
  toc: TocItem[];
  /** Front Matter */
  frontMatter?: Record<string, unknown>;
}

/**
 * MarkdownParser Markdown解析器
 */
export class MarkdownParser {
  /**
   * 解析 Markdown
   */
  parse(markdown: string, options?: MarkdownOptions): MarkdownResult {
    let content = markdown;
    let frontMatter: Record<string, unknown> | undefined;

    // 提取 Front Matter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (fmMatch) {
      try {
        // 简单解析 YAML front matter
        frontMatter = this.parseSimpleYaml(fmMatch[1] ?? '');
        content = content.slice(fmMatch[0].length);
      } catch {
        // 忽略解析错误
      }
    }

    const toc: TocItem[] = [];
    let html = content;

    // 解析标题并生成目录
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes: string, text: string) => {
      const level = hashes.length;
      const id = this.slugify(text);

      if (options?.toc) {
        toc.push({ level, text, id });
      }

      return `<h${level} id="${id}">${this.escapeHtml(text)}</h${level}>`;
    });

    // 解析加粗
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // 解析斜体
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // 解析行内代码
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // 解析链接
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

    // 解析图片
    html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">');

    // 解析代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang: string, code: string) => {
      const escaped = this.escapeHtml(code.trim());
      const highlighted = options?.highlight ? options.highlight(code.trim(), lang) : escaped;
      return `<pre><code class="language-${lang || 'plaintext'}">${highlighted}</code></pre>`;
    });

    // 解析无序列表
    html = html.replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 解析有序列表
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // 解析段落
    html = html.replace(/^(?!<[a-z]|#)(.+)$/gm, '<p>$1</p>');

    // 解析换行
    html = html.replace(/\n\n+/g, '\n');

    return {
      html,
      toc,
      frontMatter,
    };
  }

  /**
   * 渲染目录
   */
  renderToc(toc: TocItem[]): string {
    if (toc.length === 0) {
      return '';
    }

    const items = toc.map((item) => {
      const indent = '  '.repeat(item.level - 1);
      return `${indent}<li><a href="#${item.id}">${this.escapeHtml(item.text)}</a></li>`;
    });

    return `<nav class="toc"><ul>\n${items.join('\n')}\n</ul></nav>`;
  }

  /**
   * 生成锚点ID
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * 简单 YAML 解析
   */
  private parseSimpleYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (key && value !== undefined) {
          result[key] = value.trim();
        }
      }
    }

    return result;
  }
}

/**
 * 全局 Markdown 解析器实例
 */
export const markdownParser = new MarkdownParser();
