/**
 * 10位62进制 ID 生成器
 * @module @chips/foundation/core/utils/id-generator
 *
 * Chips 生态使用10位62进制编号作为所有实体的唯一标识符
 * 字符集：0-9a-zA-Z（共62个字符）
 * 容量：62^10 ≈ 8.4 × 10^17
 */

import type { ChipsId, CardId, BoxId, BaseCardId } from '../types';

/**
 * 62进制字符集
 */
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * ID 长度
 */
const ID_LENGTH = 10;

/**
 * 62^10 的最大值（用于限制生成范围）
 */
const MAX_VALUE = 62n ** 10n;

/**
 * 生成随机字节
 */
function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // 浏览器或 Node.js 20+
    return crypto.getRandomValues(new Uint8Array(length));
  }
  // Fallback（不推荐，安全性较低）
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/**
 * 将 BigInt 编码为62进制字符串
 */
function encodeBase62(value: bigint, length: number): string {
  if (value === 0n) {
    return '0'.repeat(length);
  }

  let result = '';
  const base = BigInt(BASE62_CHARS.length);
  let v = value;

  while (v > 0n) {
    const remainder = Number(v % base);
    result = BASE62_CHARS[remainder] + result;
    v = v / base;
  }

  // 左填充到指定长度
  return result.padStart(length, '0');
}

/**
 * 将62进制字符串解码为 BigInt
 */
export function decodeBase62(str: string): bigint {
  let value = 0n;
  const base = BigInt(BASE62_CHARS.length);

  for (const char of str) {
    const index = BASE62_CHARS.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character in base62 string: ${char}`);
    }
    value = value * base + BigInt(index);
  }

  return value;
}

/**
 * 生成10位62进制 ID
 */
export function generateId(): ChipsId {
  // 使用8字节随机数
  const bytes = getRandomBytes(8);

  // 转换为 BigInt
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  // 限制在 62^10 范围内，确保生成恰好10位
  value = value % MAX_VALUE;

  // 编码为10位62进制字符串
  const id = encodeBase62(value, ID_LENGTH);

  // 确保不是全0（极小概率）
  if (id === '0'.repeat(ID_LENGTH)) {
    return generateId();
  }

  return id as ChipsId;
}

/**
 * 生成卡片 ID
 */
export function generateCardId(): CardId {
  return generateId() as CardId;
}

/**
 * 生成箱子 ID
 */
export function generateBoxId(): BoxId {
  return generateId() as BoxId;
}

/**
 * 生成基础卡片 ID
 */
export function generateBaseCardId(): BaseCardId {
  return generateId() as BaseCardId;
}

/**
 * 批量生成 ID
 */
export function generateIds(count: number): ChipsId[] {
  const ids = new Set<string>();

  while (ids.size < count) {
    ids.add(generateId());
  }

  return Array.from(ids) as ChipsId[];
}

/**
 * 验证 ID 格式
 */
export function validateId(id: string): boolean {
  // 长度检查
  if (id.length !== ID_LENGTH) {
    return false;
  }

  // 字符集检查
  const pattern = /^[0-9a-zA-Z]{10}$/;
  if (!pattern.test(id)) {
    return false;
  }

  // 非全0检查
  if (id === '0'.repeat(ID_LENGTH)) {
    return false;
  }

  return true;
}

/**
 * 创建并验证卡片 ID
 */
export function createCardId(id: string): CardId {
  if (!validateId(id)) {
    throw new Error(`Invalid card ID: ${id}`);
  }
  return id as CardId;
}

/**
 * 创建并验证箱子 ID
 */
export function createBoxId(id: string): BoxId {
  if (!validateId(id)) {
    throw new Error(`Invalid box ID: ${id}`);
  }
  return id as BoxId;
}

/**
 * 创建并验证基础卡片 ID
 */
export function createBaseCardId(id: string): BaseCardId {
  if (!validateId(id)) {
    throw new Error(`Invalid base card ID: ${id}`);
  }
  return id as BaseCardId;
}

/**
 * ID 生成器类（支持预生成池）
 */
export class IdGenerator {
  private pool: ChipsId[] = [];
  private readonly minPoolSize: number;
  private readonly maxPoolSize: number;

  constructor(minPoolSize = 100, maxPoolSize = 1000) {
    this.minPoolSize = minPoolSize;
    this.maxPoolSize = maxPoolSize;
    this.refill();
  }

  /**
   * 获取一个 ID
   */
  getId(): ChipsId {
    if (this.pool.length < this.minPoolSize) {
      this.refill();
    }
    return this.pool.pop()!;
  }

  /**
   * 获取卡片 ID
   */
  getCardId(): CardId {
    return this.getId() as CardId;
  }

  /**
   * 获取箱子 ID
   */
  getBoxId(): BoxId {
    return this.getId() as BoxId;
  }

  /**
   * 获取基础卡片 ID
   */
  getBaseCardId(): BaseCardId {
    return this.getId() as BaseCardId;
  }

  /**
   * 补充池
   */
  private refill(): void {
    const count = this.maxPoolSize - this.pool.length;
    if (count > 0) {
      const newIds = generateIds(count);
      this.pool.push(...newIds);
    }
  }
}

/**
 * 全局 ID 生成器实例
 */
export const idGenerator = new IdGenerator();
