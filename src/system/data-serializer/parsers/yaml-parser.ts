/**
 * YAML 解析器
 * @module @chips/foundation/system/data-serializer/parsers/yaml-parser
 */

import yaml from 'js-yaml';
import { ParseError } from '../../../core/errors';

/**
 * YAML 解析选项
 */
export interface YAMLParseOptions {
  /** 是否允许重复键 */
  allowDuplicateKeys?: boolean;
  /** 自定义类型 */
  schema?: yaml.Schema;
}

/**
 * YAML 序列化选项
 */
export interface YAMLStringifyOptions {
  /** 缩进空格数 */
  indent?: number;
  /** 行宽限制（-1 表示不限制） */
  lineWidth?: number;
  /** 是否禁用引用 */
  noRefs?: boolean;
  /** 是否排序键 */
  sortKeys?: boolean;
  /** 流式风格级别 */
  flowLevel?: number;
}

/**
 * YAML 解析器
 */
export class YAMLParser {
  /**
   * 解析 YAML 字符串
   * @param content YAML 内容
   * @param options 解析选项
   * @returns 解析后的对象
   */
  parse<T>(content: string, options?: YAMLParseOptions): T {
    try {
      const result = yaml.load(content, {
        schema: options?.schema,
        json: true,
      });
      return result as T;
    } catch (error) {
      const err = error as Error;
      throw new ParseError('YAML', err.message, err);
    }
  }

  /**
   * 解析所有 YAML 文档
   * @param content YAML 内容（可能包含多个文档）
   * @returns 解析后的对象数组
   */
  parseAll<T>(content: string, options?: YAMLParseOptions): T[] {
    try {
      const results = yaml.loadAll(content, undefined, {
        schema: options?.schema,
        json: true,
      });
      return results as T[];
    } catch (error) {
      const err = error as Error;
      throw new ParseError('YAML', err.message, err);
    }
  }

  /**
   * 序列化为 YAML 字符串
   * @param data 要序列化的数据
   * @param options 序列化选项
   * @returns YAML 字符串
   */
  stringify(data: unknown, options?: YAMLStringifyOptions): string {
    try {
      return yaml.dump(data, {
        indent: options?.indent ?? 2,
        lineWidth: options?.lineWidth ?? -1,
        noRefs: options?.noRefs ?? true,
        sortKeys: options?.sortKeys ?? false,
        flowLevel: options?.flowLevel ?? -1,
        skipInvalid: false,
        noCompatMode: true,
      });
    } catch (error) {
      const err = error as Error;
      throw new ParseError('YAML', `Failed to stringify: ${err.message}`, err);
    }
  }
}

/**
 * 全局 YAML 解析器实例
 */
export const yamlParser = new YAMLParser();

/**
 * 解析 YAML
 */
export function parseYAML<T>(content: string, options?: YAMLParseOptions): T {
  return yamlParser.parse<T>(content, options);
}

/**
 * 序列化为 YAML
 */
export function stringifyYAML(data: unknown, options?: YAMLStringifyOptions): string {
  return yamlParser.stringify(data, options);
}
