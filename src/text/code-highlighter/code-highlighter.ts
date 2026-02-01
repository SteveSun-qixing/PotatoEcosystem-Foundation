/**
 * CodeHighlighter 代码高亮器
 * @module @chips/foundation/text/code-highlighter/code-highlighter
 *
 * 提供代码语法高亮功能
 * 实际项目中应集成 highlight.js
 */

/**
 * 高亮选项
 */
export interface HighlightOptions {
  /** 语言 */
  language?: string;
  /** 是否显示行号 */
  lineNumbers?: boolean;
  /** 起始行号 */
  startLine?: number;
  /** 高亮行 */
  highlightLines?: number[];
}

/**
 * 高亮结果
 */
export interface HighlightResult {
  /** HTML 内容 */
  html: string;
  /** 检测到的语言 */
  language: string;
  /** 行数 */
  lineCount: number;
}

/**
 * CodeHighlighter 代码高亮器
 */
export class CodeHighlighter {
  private registeredLanguages: Set<string> = new Set([
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
    'csharp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'html', 'css', 'json', 'yaml', 'xml', 'markdown', 'sql',
    'bash', 'shell', 'powershell',
  ]);

  /**
   * 高亮代码
   */
  highlight(code: string, options?: HighlightOptions): HighlightResult {
    const language = options?.language ?? 'plaintext';
    const lines = code.split('\n');

    // 转义 HTML
    const escapedLines = lines.map((line) => this.escapeHtml(line));

    let html: string;

    if (options?.lineNumbers) {
      const startLine = options?.startLine ?? 1;
      const highlightLines = new Set(options?.highlightLines ?? []);

      html = escapedLines
        .map((line, i) => {
          const lineNum = startLine + i;
          const highlighted = highlightLines.has(lineNum) ? ' class="highlighted"' : '';
          return `<span class="line"${highlighted}><span class="line-number">${lineNum}</span><span class="line-content">${line}</span></span>`;
        })
        .join('\n');
    } else {
      html = escapedLines.join('\n');
    }

    // 包装
    html = `<pre class="code-block" data-language="${language}"><code class="language-${language}">${html}</code></pre>`;

    return {
      html,
      language,
      lineCount: lines.length,
    };
  }

  /**
   * 自动检测语言
   */
  detectLanguage(code: string): string {
    // 简单的语言检测
    if (code.includes('function') && code.includes('=>')) {
      return 'javascript';
    }
    if (code.includes('def ') && code.includes(':')) {
      return 'python';
    }
    if (code.includes('public class') || code.includes('private void')) {
      return 'java';
    }
    if (code.includes('<html') || code.includes('<!DOCTYPE')) {
      return 'html';
    }
    if (code.includes('{') && code.includes('}') && code.includes(':')) {
      return 'json';
    }
    return 'plaintext';
  }

  /**
   * 检查语言是否支持
   */
  isLanguageSupported(language: string): boolean {
    return this.registeredLanguages.has(language.toLowerCase());
  }

  /**
   * 获取支持的语言
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.registeredLanguages);
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
}

/**
 * 全局代码高亮器实例
 */
export const codeHighlighter = new CodeHighlighter();
