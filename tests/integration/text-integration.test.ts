/**
 * 文本处理模块集成测试
 * @module tests/integration/text-integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CodeHighlighter,
  MarkdownParser,
  ChipsRichTextRenderer,
  TextEditor,
} from '../../src';

describe('文本处理模块集成测试', () => {
  describe('MarkdownParser + CodeHighlighter 集成', () => {
    let markdownParser: MarkdownParser;
    let codeHighlighter: CodeHighlighter;

    beforeEach(() => {
      markdownParser = new MarkdownParser();
      codeHighlighter = new CodeHighlighter();
    });

    it('应该能够解析包含代码块的 Markdown', () => {
      const markdown = `
# 代码示例

这是一段说明文字。

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

以上是一个简单的函数。
`;

      const result = markdownParser.parse(markdown);

      expect(result.html).toContain('<h1');
      expect(result.html).toContain('代码示例');
      expect(result.html).toContain('说明文字');
    });

    it('应该能够单独高亮代码并嵌入 HTML', () => {
      const code = `const x = 1;
const y = 2;
console.log(x + y);`;

      const highlighted = codeHighlighter.highlight(code, { language: 'javascript' });

      expect(highlighted.html).toContain('code');
      expect(typeof highlighted.language).toBe('string');
    });
  });

  describe('TextEditor 撤销/重做集成', () => {
    let editor: TextEditor;

    beforeEach(() => {
      editor = new TextEditor();
    });

    it('应该能够完成复杂编辑操作并撤销', () => {
      // 初始文本
      editor.setContent('Hello');

      // 执行多个操作
      editor.insert(5, ' World'); // "Hello World"
      editor.insert(11, '!'); // "Hello World!"
      editor.replace(0, 5, 'Hi'); // "Hi World!"

      expect(editor.getContent()).toBe('Hi World!');

      // 撤销最后一个操作
      editor.undo();
      expect(editor.getContent()).toBe('Hello World!');

      // 再撤销
      editor.undo();
      expect(editor.getContent()).toBe('Hello World');

      // 重做
      editor.redo();
      expect(editor.getContent()).toBe('Hello World!');
    });

    it('应该能够处理查找和替换', () => {
      editor.setContent('The quick brown fox jumps over the lazy dog');

      // 查找
      const results = editor.search('the');
      expect(results.length).toBe(2); // "The" 和 "the"

      // 替换
      editor.searchAndReplace('the', 'a', { replaceAll: true }); // 全部替换
      expect(editor.getContent()).toBe('a quick brown fox jumps over a lazy dog');
    });
  });

  describe('RichTextRenderer 与 Markdown 转换', () => {
    it('应该能够将 Markdown 转换为富文本结构并渲染', () => {
      const markdownParser = new MarkdownParser();
      const richTextRenderer = new ChipsRichTextRenderer();

      // Markdown 转 HTML
      const markdown = '**粗体** 和 *斜体*';
      const { html: markdownHtml } = markdownParser.parse(markdown);

      // 富文本节点
      const richTextNodes = [
        {
          type: 'paragraph' as const,
          children: [
            { type: 'bold' as const, children: [{ type: 'text' as const, text: '粗体' }] },
            { type: 'text' as const, text: ' 和 ' },
            { type: 'italic' as const, children: [{ type: 'text' as const, text: '斜体' }] },
          ],
        },
      ];

      const richHtml = richTextRenderer.render(richTextNodes);

      expect(richHtml).toContain('粗体');
      expect(richHtml).toContain('斜体');
      expect(markdownHtml).toContain('<strong>');
      expect(markdownHtml).toContain('<em>');
    });
  });

  describe('文本处理完整流程', () => {
    it('应该能够完成从编辑到渲染的完整流程', () => {
      // 1. 使用 TextEditor 创建内容
      const editor = new TextEditor();
      editor.setContent('# 标题\n\n这是正文内容。');

      // 2. 追加更多内容
      editor.insert(editor.getContent().length, '\n\n**粗体文字**');

      // 3. 使用 MarkdownParser 解析
      const parser = new MarkdownParser();
      const { html, toc } = parser.parse(editor.getContent(), { toc: true });

      // 4. 验证结果
      expect(html).toContain('<h1');
      expect(html).toContain('正文内容');
      expect(html).toContain('<strong>');
      expect(toc).toHaveLength(1);
      expect(toc[0]?.text).toBe('标题');
    });
  });
});
