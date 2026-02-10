/**
 * 字符串插值器
 * @module @chips/foundation/system/i18n-system/interpolator
 */

/**
 * 变量插值
 * 支持格式：{varName}
 *
 * @param text 包含变量占位符的文本
 * @param vars 变量映射
 * @returns 插值后的文本
 */
export function interpolate(
  text: string,
  vars: Record<string, string | number>
): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined) {
      return match;
    }
    // 转义 HTML 特殊字符，防止 XSS
    return escapeHtml(String(value));
  });
}

/**
 * 转义 HTML 特殊字符
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 复数形式处理
 * 支持格式：{count, plural, =0 {zero} =1 {one} other {many}}
 * 支持嵌套大括号中的变量引用：other {{count} items}
 *
 * @param text 包含复数占位符的文本
 * @param vars 变量映射
 * @returns 处理后的文本
 */
export function pluralize(
  text: string,
  vars: Record<string, string | number>
): string {
  // 使用手动解析来支持嵌套大括号
  let result = text;
  let startIndex = 0;

  while (startIndex < result.length) {
    // 查找 {key, plural, 模式
    const pluralMatch = result.slice(startIndex).match(/\{(\w+),\s*plural,\s*/);
    if (!pluralMatch || pluralMatch.index === undefined) {
      break;
    }

    const matchStart = startIndex + pluralMatch.index;
    const contentStart = matchStart + pluralMatch[0].length;
    const key = pluralMatch[1];
    const value = vars[key];

    if (value === undefined) {
      startIndex = contentStart;
      continue;
    }

    const numValue = typeof value === 'number' ? value : parseInt(String(value), 10);

    // 解析规则部分，支持嵌套大括号
    const rules: Record<string, string> = {};
    let pos = contentStart;

    while (pos < result.length) {
      // 跳过空白
      while (pos < result.length && /\s/.test(result[pos])) pos++;

      // 检查是否到达外层闭合大括号
      if (result[pos] === '}') {
        break;
      }

      // 解析规则键名：=0, =1, other, few, many 等
      const ruleKeyMatch = result.slice(pos).match(/^(=\d+|zero|one|two|few|many|other)\s*\{/);
      if (!ruleKeyMatch) {
        break;
      }

      const ruleKey = ruleKeyMatch[1];
      pos += ruleKeyMatch[0].length;

      // 使用大括号计数来提取内容（支持嵌套）
      let braceDepth = 1;
      const contentStartPos = pos;

      while (pos < result.length && braceDepth > 0) {
        if (result[pos] === '{') braceDepth++;
        else if (result[pos] === '}') braceDepth--;
        if (braceDepth > 0) pos++;
      }

      rules[ruleKey] = result.slice(contentStartPos, pos);
      pos++; // 跳过闭合大括号
    }

    // 选择正确的复数形式
    let selectedText: string | undefined;

    // 精确数值匹配
    const exactKey = `=${numValue}`;
    if (rules[exactKey] !== undefined) {
      selectedText = rules[exactKey];
    } else if (numValue === 0 && rules['zero'] !== undefined) {
      selectedText = rules['zero'];
    } else if (numValue === 1 && rules['one'] !== undefined) {
      selectedText = rules['one'];
    } else if (numValue === 2 && rules['two'] !== undefined) {
      selectedText = rules['two'];
    } else if (rules['other'] !== undefined) {
      selectedText = rules['other'];
    }

    if (selectedText !== undefined) {
      // 对选中的文本进行变量插值
      const interpolated = interpolate(selectedText, vars);
      // 替换整个 plural 表达式（包括最外层的闭合大括号）
      const endPos = pos + 1; // 包括最外层闭合大括号
      result = result.slice(0, matchStart) + interpolated + result.slice(endPos);
      startIndex = matchStart + interpolated.length;
    } else {
      startIndex = pos + 1;
    }
  }

  return result;
}

/**
 * 完整的文本处理（插值 + 复数）
 */
export function processText(
  text: string,
  vars: Record<string, string | number>
): string {
  let result = text;

  // 先处理复数
  result = pluralize(result, vars);

  // 再处理普通插值
  result = interpolate(result, vars);

  return result;
}
