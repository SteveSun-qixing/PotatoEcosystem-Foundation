/**
 * JSON 解析器
 * @module @chips/foundation/system/data-serializer/parsers/json-parser
 */

import { ParseError } from '../../../core/errors';

/**
 * JSON 解析选项
 */
export interface JSONParseOptions {
  /** 自定义 reviver 函数 */
  reviver?: (key: string, value: unknown) => unknown;
}

/**
 * JSON 序列化选项
 */
export interface JSONStringifyOptions {
  /** 是否美化输出 */
  pretty?: boolean;
  /** 缩进空格数或字符串 */
  indent?: number | string;
  /** 自定义 replacer 函数或数组 */
  replacer?: ((key: string, value: unknown) => unknown) | (string | number)[];
}

/**
 * JSON 解析器
 */
export class JSONParser {
  /**
   * 解析 JSON 字符串
   * @param content JSON 内容
   * @param options 解析选项
   * @returns 解析后的对象
   */
  parse<T>(content: string, options?: JSONParseOptions): T {
    try {
      return JSON.parse(content, options?.reviver) as T;
    } catch (error) {
      const err = error as Error;
      throw new ParseError('JSON', err.message, err);
    }
  }

  /**
   * 安全解析 JSON（失败时返回默认值）
   * @param content JSON 内容
   * @param defaultValue 默认值
   * @returns 解析后的对象或默认值
   */
  safeParse<T>(content: string, defaultValue: T): T {
    try {
      return JSON.parse(content) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * 序列化为 JSON 字符串
   * @param data 要序列化的数据
   * @param options 序列化选项
   * @returns JSON 字符串
   */
  stringify(data: unknown, options?: JSONStringifyOptions): string {
    try {
      const indent = options?.pretty ? (options?.indent ?? 2) : undefined;
      return JSON.stringify(data, options?.replacer as never, indent);
    } catch (error) {
      const err = error as Error;
      throw new ParseError('JSON', `Failed to stringify: ${err.message}`, err);
    }
  }

  /**
   * 深拷贝对象（通过序列化/反序列化）
   * @param data 要拷贝的数据
   * @returns 深拷贝后的对象
   */
  deepClone<T>(data: T): T {
    return JSON.parse(JSON.stringify(data)) as T;
  }
}

/**
 * 全局 JSON 解析器实例
 */
export const jsonParser = new JSONParser();

/**
 * 解析 JSON
 */
export function parseJSON<T>(content: string, options?: JSONParseOptions): T {
  return jsonParser.parse<T>(content, options);
}

/**
 * 序列化为 JSON
 */
export function stringifyJSON(data: unknown, options?: JSONStringifyOptions): string {
  return jsonParser.stringify(data, options);
}
