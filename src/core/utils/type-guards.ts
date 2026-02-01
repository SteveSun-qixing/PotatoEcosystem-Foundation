/**
 * 类型守卫函数
 * @module @chips/foundation/core/utils/type-guards
 */

import type {
  CardMetadata,
  BoxMetadata,
  BaseCardConfig,
  CoreRequest,
  CoreResponse,
} from '../types';

/**
 * 检查值是否为对象
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 检查值是否为字符串
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 检查值是否为布尔值
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 检查值是否为数组
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * 检查值是否为函数
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/**
 * 检查值是否为 Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (isObject(value) &&
      'then' in value &&
      isFunction(value['then']))
  );
}

/**
 * 检查值是否为 null 或 undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查值是否不为 null 或 undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 检查是否为有效的 CoreRequest
 */
export function isCoreRequest<T = unknown>(value: unknown): value is CoreRequest<T> {
  if (!isObject(value)) {
    return false;
  }
  return isString(value['target']) && isString(value['action']) && 'params' in value;
}

/**
 * 检查是否为有效的 CoreResponse
 */
export function isCoreResponse<T = unknown>(value: unknown): value is CoreResponse<T> {
  if (!isObject(value)) {
    return false;
  }
  return isBoolean(value['success']);
}

/**
 * 检查是否为有效的卡片元数据
 */
export function isCardMetadata(value: unknown): value is CardMetadata {
  if (!isObject(value)) {
    return false;
  }
  return (
    isString(value['id']) &&
    isString(value['name']) &&
    isString(value['created_at']) &&
    isString(value['modified_at'])
  );
}

/**
 * 检查是否为有效的箱子元数据
 */
export function isBoxMetadata(value: unknown): value is BoxMetadata {
  if (!isObject(value)) {
    return false;
  }
  return (
    isString(value['id']) &&
    isString(value['name']) &&
    isString(value['created_at']) &&
    isString(value['modified_at'])
  );
}

/**
 * 检查是否为有效的基础卡片配置
 */
export function isBaseCardConfig<T = unknown>(value: unknown): value is BaseCardConfig<T> {
  if (!isObject(value)) {
    return false;
  }
  return isString(value['card_type']) && 'content' in value;
}

/**
 * 断言值不为 null 或 undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined');
  }
}

/**
 * 断言条件为真
 */
export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed');
  }
}

/**
 * 永不到达的代码路径
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}
