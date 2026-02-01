/**
 * Schema 验证器
 * @module @chips/foundation/system/data-serializer/schema-validator
 *
 * 简化版 JSON Schema 验证器
 */

import type { JSONSchema, ValidationResult, ValidationError } from '../../core/interfaces';

/**
 * Schema 验证器类
 */
export class SchemaValidator {
  /**
   * 验证数据是否符合 Schema
   * @param data 要验证的数据
   * @param schema JSON Schema
   * @returns 验证结果
   */
  validate<T>(data: unknown, schema: JSONSchema): ValidationResult<T> {
    const errors: ValidationError[] = [];
    this.validateNode(data, schema, '', errors);

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? (data as T) : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 递归验证节点
   */
  private validateNode(
    data: unknown,
    schema: JSONSchema,
    path: string,
    errors: ValidationError[]
  ): void {
    // 类型检查
    if (schema['type'] !== undefined) {
      const type = schema['type'] as string;
      if (!this.checkType(data, type)) {
        errors.push({
          path: path || '$',
          message: `Expected type "${type}", got "${typeof data}"`,
          keyword: 'type',
        });
        return;
      }
    }

    // 必填属性检查
    if (schema['required'] !== undefined && typeof data === 'object' && data !== null) {
      const required = schema['required'] as string[];
      const obj = data as Record<string, unknown>;
      for (const prop of required) {
        if (!(prop in obj)) {
          errors.push({
            path: path ? `${path}.${prop}` : prop,
            message: `Missing required property "${prop}"`,
            keyword: 'required',
          });
        }
      }
    }

    // 属性验证
    if (schema['properties'] !== undefined && typeof data === 'object' && data !== null) {
      const properties = schema['properties'] as Record<string, JSONSchema>;
      const obj = data as Record<string, unknown>;
      for (const [propName, propSchema] of Object.entries(properties)) {
        if (propName in obj) {
          const propPath = path ? `${path}.${propName}` : propName;
          this.validateNode(obj[propName], propSchema, propPath, errors);
        }
      }
    }

    // 数组项验证
    if (schema['items'] !== undefined && Array.isArray(data)) {
      const itemSchema = schema['items'] as JSONSchema;
      for (let i = 0; i < data.length; i++) {
        const itemPath = `${path}[${i}]`;
        this.validateNode(data[i], itemSchema, itemPath, errors);
      }
    }

    // 最小值检查
    if (schema['minimum'] !== undefined && typeof data === 'number') {
      const minimum = schema['minimum'] as number;
      if (data < minimum) {
        errors.push({
          path: path || '$',
          message: `Value ${data} is less than minimum ${minimum}`,
          keyword: 'minimum',
        });
      }
    }

    // 最大值检查
    if (schema['maximum'] !== undefined && typeof data === 'number') {
      const maximum = schema['maximum'] as number;
      if (data > maximum) {
        errors.push({
          path: path || '$',
          message: `Value ${data} is greater than maximum ${maximum}`,
          keyword: 'maximum',
        });
      }
    }

    // 最小长度检查
    if (schema['minLength'] !== undefined && typeof data === 'string') {
      const minLength = schema['minLength'] as number;
      if (data.length < minLength) {
        errors.push({
          path: path || '$',
          message: `String length ${data.length} is less than minimum ${minLength}`,
          keyword: 'minLength',
        });
      }
    }

    // 最大长度检查
    if (schema['maxLength'] !== undefined && typeof data === 'string') {
      const maxLength = schema['maxLength'] as number;
      if (data.length > maxLength) {
        errors.push({
          path: path || '$',
          message: `String length ${data.length} is greater than maximum ${maxLength}`,
          keyword: 'maxLength',
        });
      }
    }

    // 正则表达式检查
    if (schema['pattern'] !== undefined && typeof data === 'string') {
      const pattern = new RegExp(schema['pattern'] as string);
      if (!pattern.test(data)) {
        errors.push({
          path: path || '$',
          message: `String does not match pattern "${schema['pattern']}"`,
          keyword: 'pattern',
        });
      }
    }

    // 枚举检查
    if (schema['enum'] !== undefined) {
      const enumValues = schema['enum'] as unknown[];
      if (!enumValues.includes(data)) {
        errors.push({
          path: path || '$',
          message: `Value must be one of: ${enumValues.join(', ')}`,
          keyword: 'enum',
        });
      }
    }
  }

  /**
   * 检查数据类型
   */
  private checkType(data: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof data === 'string';
      case 'number':
        return typeof data === 'number' && !isNaN(data);
      case 'integer':
        return typeof data === 'number' && Number.isInteger(data);
      case 'boolean':
        return typeof data === 'boolean';
      case 'object':
        return typeof data === 'object' && data !== null && !Array.isArray(data);
      case 'array':
        return Array.isArray(data);
      case 'null':
        return data === null;
      default:
        return true;
    }
  }
}

/**
 * 全局 Schema 验证器实例
 */
export const schemaValidator = new SchemaValidator();

/**
 * 验证数据
 */
export function validateSchema<T>(data: unknown, schema: JSONSchema): ValidationResult<T> {
  return schemaValidator.validate<T>(data, schema);
}
