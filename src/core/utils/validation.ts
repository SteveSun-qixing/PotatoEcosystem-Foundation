/**
 * 验证工具函数
 * @module @chips/foundation/core/utils/validation
 */

import { ValidationError } from '../errors';

/**
 * 验证规则
 */
export interface ValidationRule<T> {
  /** 验证函数 */
  validate: (value: T) => boolean;
  /** 错误消息 */
  message: string;
}

/**
 * 验证结果
 */
export interface ValidateResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误消息列表 */
  errors: string[];
}

/**
 * 验证器类
 */
export class Validator<T> {
  private rules: ValidationRule<T>[] = [];

  /**
   * 添加验证规则
   */
  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  /**
   * 添加必填规则
   */
  required(message = 'Value is required'): this {
    return this.addRule({
      validate: (value) => value !== null && value !== undefined && value !== '',
      message,
    });
  }

  /**
   * 执行验证
   */
  validate(value: T): ValidateResult {
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证并抛出错误
   */
  validateOrThrow(value: T): void {
    const result = this.validate(value);
    if (!result.valid) {
      throw new ValidationError(result.errors.join('; '), { errors: result.errors });
    }
  }
}

/**
 * 字符串验证器
 */
export class StringValidator extends Validator<string> {
  /**
   * 最小长度
   */
  minLength(min: number, message?: string): this {
    return this.addRule({
      validate: (value) => value.length >= min,
      message: message ?? `Minimum length is ${min}`,
    });
  }

  /**
   * 最大长度
   */
  maxLength(max: number, message?: string): this {
    return this.addRule({
      validate: (value) => value.length <= max,
      message: message ?? `Maximum length is ${max}`,
    });
  }

  /**
   * 正则匹配
   */
  pattern(regex: RegExp, message?: string): this {
    return this.addRule({
      validate: (value) => regex.test(value),
      message: message ?? `Value does not match pattern`,
    });
  }

  /**
   * 邮箱格式
   */
  email(message = 'Invalid email format'): this {
    return this.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
  }

  /**
   * URL 格式
   */
  url(message = 'Invalid URL format'): this {
    return this.addRule({
      validate: (value) => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message,
    });
  }
}

/**
 * 数字验证器
 */
export class NumberValidator extends Validator<number> {
  /**
   * 最小值
   */
  min(min: number, message?: string): this {
    return this.addRule({
      validate: (value) => value >= min,
      message: message ?? `Minimum value is ${min}`,
    });
  }

  /**
   * 最大值
   */
  max(max: number, message?: string): this {
    return this.addRule({
      validate: (value) => value <= max,
      message: message ?? `Maximum value is ${max}`,
    });
  }

  /**
   * 范围
   */
  range(min: number, max: number, message?: string): this {
    return this.addRule({
      validate: (value) => value >= min && value <= max,
      message: message ?? `Value must be between ${min} and ${max}`,
    });
  }

  /**
   * 整数
   */
  integer(message = 'Value must be an integer'): this {
    return this.addRule({
      validate: (value) => Number.isInteger(value),
      message,
    });
  }

  /**
   * 正数
   */
  positive(message = 'Value must be positive'): this {
    return this.addRule({
      validate: (value) => value > 0,
      message,
    });
  }
}

/**
 * 数组验证器
 */
export class ArrayValidator<T> extends Validator<T[]> {
  /**
   * 最小长度
   */
  minLength(min: number, message?: string): this {
    return this.addRule({
      validate: (value) => value.length >= min,
      message: message ?? `Minimum length is ${min}`,
    });
  }

  /**
   * 最大长度
   */
  maxLength(max: number, message?: string): this {
    return this.addRule({
      validate: (value) => value.length <= max,
      message: message ?? `Maximum length is ${max}`,
    });
  }

  /**
   * 非空
   */
  notEmpty(message = 'Array cannot be empty'): this {
    return this.minLength(1, message);
  }

  /**
   * 每个元素都满足条件
   */
  every(predicate: (item: T) => boolean, message?: string): this {
    return this.addRule({
      validate: (value) => value.every(predicate),
      message: message ?? `Not all elements satisfy the condition`,
    });
  }
}

/**
 * 创建字符串验证器
 */
export function string(): StringValidator {
  return new StringValidator();
}

/**
 * 创建数字验证器
 */
export function number(): NumberValidator {
  return new NumberValidator();
}

/**
 * 创建数组验证器
 */
export function array<T>(): ArrayValidator<T> {
  return new ArrayValidator<T>();
}

/**
 * 快速验证（单次验证）
 */
export function validate<T>(
  value: T,
  predicate: (value: T) => boolean,
  message: string
): void {
  if (!predicate(value)) {
    throw new ValidationError(message, { value });
  }
}

/**
 * 验证必填
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`, { field: fieldName });
  }
}

/**
 * 验证类型
 */
export function validateType<T>(
  value: unknown,
  typeName: string,
  typeCheck: (value: unknown) => value is T
): asserts value is T {
  if (!typeCheck(value)) {
    throw new ValidationError(`Expected ${typeName}`, { value, expectedType: typeName });
  }
}
