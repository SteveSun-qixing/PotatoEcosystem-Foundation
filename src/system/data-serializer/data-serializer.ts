/**
 * DataSerializer 数据序列化器
 * @module @chips/foundation/system/data-serializer/data-serializer
 */

import type {
  IDataSerializer,
  DataFormat,
  SerializeOptions,
  JSONSchema,
  ValidationResult,
} from '../../core/interfaces';
import { YAMLParser, type YAMLParseOptions, type YAMLStringifyOptions } from './parsers/yaml-parser';
import { JSONParser, type JSONParseOptions, type JSONStringifyOptions } from './parsers/json-parser';
import { SchemaValidator } from './schema-validator';
import { ChipsError, ErrorCodes } from '../../core/errors';

/**
 * DataSerializer 实现
 * 统一的数据序列化器，支持 YAML 和 JSON 格式
 */
export class DataSerializer implements IDataSerializer {
  private yamlParser: YAMLParser;
  private jsonParser: JSONParser;
  private schemaValidator: SchemaValidator;

  constructor() {
    this.yamlParser = new YAMLParser();
    this.jsonParser = new JSONParser();
    this.schemaValidator = new SchemaValidator();
  }

  /**
   * 解析 YAML
   */
  parseYAML<T>(content: string, options?: YAMLParseOptions): T {
    return this.yamlParser.parse<T>(content, options);
  }

  /**
   * 序列化为 YAML
   */
  stringifyYAML(data: unknown, options?: SerializeOptions): string {
    const yamlOptions: YAMLStringifyOptions = {
      indent: options?.indent ?? 2,
    };
    return this.yamlParser.stringify(data, yamlOptions);
  }

  /**
   * 解析 JSON
   */
  parseJSON<T>(content: string, options?: JSONParseOptions): T {
    return this.jsonParser.parse<T>(content, options);
  }

  /**
   * 序列化为 JSON
   */
  stringifyJSON(data: unknown, options?: SerializeOptions): string {
    const jsonOptions: JSONStringifyOptions = {
      pretty: options?.pretty ?? false,
      indent: options?.indent ?? 2,
    };
    return this.jsonParser.stringify(data, jsonOptions);
  }

  /**
   * 通用解析
   */
  parse<T>(content: string, format: DataFormat): T {
    switch (format) {
      case 'yaml':
        return this.parseYAML<T>(content);
      case 'json':
        return this.parseJSON<T>(content);
      default:
        throw new ChipsError(
          ErrorCodes.INVALID_FORMAT,
          `Unsupported format: ${format as string}`
        );
    }
  }

  /**
   * 通用序列化
   */
  stringify(data: unknown, format: DataFormat, options?: SerializeOptions): string {
    switch (format) {
      case 'yaml':
        return this.stringifyYAML(data, options);
      case 'json':
        return this.stringifyJSON(data, options);
      default:
        throw new ChipsError(
          ErrorCodes.INVALID_FORMAT,
          `Unsupported format: ${format as string}`
        );
    }
  }

  /**
   * 验证数据
   */
  validate<T>(data: unknown, schema: JSONSchema): ValidationResult<T> {
    return this.schemaValidator.validate<T>(data, schema);
  }

  /**
   * 解析并验证
   */
  parseAndValidate<T>(
    content: string,
    format: DataFormat,
    schema: JSONSchema
  ): ValidationResult<T> {
    const data = this.parse<unknown>(content, format);
    return this.validate<T>(data, schema);
  }

  /**
   * 自动检测格式并解析
   */
  autoParse<T>(content: string): T {
    const trimmed = content.trim();

    // 尝试 JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return this.parseJSON<T>(content);
      } catch {
        // 继续尝试 YAML
      }
    }

    // 默认尝试 YAML
    return this.parseYAML<T>(content);
  }
}

/**
 * 全局 DataSerializer 实例
 */
export const dataSerializer = new DataSerializer();
