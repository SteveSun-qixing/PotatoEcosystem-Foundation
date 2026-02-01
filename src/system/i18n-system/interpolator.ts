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
 *
 * @param text 包含复数占位符的文本
 * @param vars 变量映射
 * @returns 处理后的文本
 */
export function pluralize(
  text: string,
  vars: Record<string, string | number>
): string {
  // 简化的复数处理：{count, plural, =0 {none} =1 {one} other {{count} items}}
  return text.replace(
    /\{(\w+),\s*plural,\s*((?:=\d+\s*\{[^}]*\}\s*)+)other\s*\{([^}]*)\}\}/g,
    (match, key: string, rules: string, other: string) => {
      const value = vars[key];
      if (value === undefined) {
        return match;
      }

      const numValue = typeof value === 'number' ? value : parseInt(String(value), 10);

      // 检查精确匹配
      const exactMatch = rules.match(new RegExp(`=${numValue}\\s*\\{([^}]*)\\}`));
      if (exactMatch?.[1] !== undefined) {
        return interpolate(exactMatch[1], vars);
      }

      // 使用 other 形式
      return interpolate(other, vars);
    }
  );
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
