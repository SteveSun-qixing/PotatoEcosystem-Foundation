/**
 * ID 生成器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateId,
  generateCardId,
  generateBoxId,
  generateBaseCardId,
  generateIds,
  validateId,
  createCardId,
  createBoxId,
  createBaseCardId,
  decodeBase62,
  IdGenerator,
} from '../../../src/core/utils/id-generator';

describe('ID Generator', () => {
  describe('generateId', () => {
    it('should generate a 10-character ID', () => {
      const id = generateId();
      expect(id).toHaveLength(10);
    });

    it('should only contain valid base62 characters', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-zA-Z]{10}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(1000);
    });

    it('should not generate all-zero ID', () => {
      for (let i = 0; i < 100; i++) {
        const id = generateId();
        expect(id).not.toBe('0000000000');
      }
    });
  });

  describe('generateCardId', () => {
    it('should generate a valid card ID', () => {
      const id = generateCardId();
      expect(id).toHaveLength(10);
      expect(validateId(id)).toBe(true);
    });
  });

  describe('generateBoxId', () => {
    it('should generate a valid box ID', () => {
      const id = generateBoxId();
      expect(id).toHaveLength(10);
      expect(validateId(id)).toBe(true);
    });
  });

  describe('generateBaseCardId', () => {
    it('should generate a valid base card ID', () => {
      const id = generateBaseCardId();
      expect(id).toHaveLength(10);
      expect(validateId(id)).toBe(true);
    });
  });

  describe('generateIds', () => {
    it('should generate specified number of unique IDs', () => {
      const ids = generateIds(100);
      expect(ids).toHaveLength(100);
      expect(new Set(ids).size).toBe(100);
    });

    it('should generate all valid IDs', () => {
      const ids = generateIds(50);
      for (const id of ids) {
        expect(validateId(id)).toBe(true);
      }
    });
  });

  describe('validateId', () => {
    it('should return true for valid IDs', () => {
      expect(validateId('a1B2c3D4e5')).toBe(true);
      expect(validateId('0123456789')).toBe(true);
      expect(validateId('abcdefghij')).toBe(true);
      expect(validateId('ABCDEFGHIJ')).toBe(true);
      expect(validateId('aA1bB2cC3d')).toBe(true);
    });

    it('should return false for invalid length', () => {
      expect(validateId('short')).toBe(false);
      expect(validateId('toolongstring')).toBe(false);
      expect(validateId('')).toBe(false);
    });

    it('should return false for invalid characters', () => {
      expect(validateId('invalid-id')).toBe(false);
      expect(validateId('invalid_id')).toBe(false);
      expect(validateId('id!@#$%^&*')).toBe(false);
      expect(validateId('有中文字符')).toBe(false);
    });

    it('should return false for all-zero ID', () => {
      expect(validateId('0000000000')).toBe(false);
    });
  });

  describe('createCardId', () => {
    it('should create a card ID from valid string', () => {
      const id = createCardId('a1B2c3D4e5');
      expect(id).toBe('a1B2c3D4e5');
    });

    it('should throw for invalid ID', () => {
      expect(() => createCardId('invalid')).toThrow('Invalid card ID');
    });
  });

  describe('createBoxId', () => {
    it('should create a box ID from valid string', () => {
      const id = createBoxId('a1B2c3D4e5');
      expect(id).toBe('a1B2c3D4e5');
    });

    it('should throw for invalid ID', () => {
      expect(() => createBoxId('invalid')).toThrow('Invalid box ID');
    });
  });

  describe('createBaseCardId', () => {
    it('should create a base card ID from valid string', () => {
      const id = createBaseCardId('a1B2c3D4e5');
      expect(id).toBe('a1B2c3D4e5');
    });

    it('should throw for invalid ID', () => {
      expect(() => createBaseCardId('invalid')).toThrow('Invalid base card ID');
    });
  });

  describe('decodeBase62', () => {
    it('should decode base62 string to BigInt', () => {
      expect(decodeBase62('0000000000')).toBe(0n);
      expect(decodeBase62('0000000001')).toBe(1n);
      expect(decodeBase62('000000000a')).toBe(10n);
      expect(decodeBase62('000000000A')).toBe(36n);
    });

    it('should throw for invalid characters', () => {
      expect(() => decodeBase62('invalid!')).toThrow('Invalid character');
    });
  });

  describe('IdGenerator class', () => {
    let generator: IdGenerator;

    beforeEach(() => {
      generator = new IdGenerator(10, 100);
    });

    it('should generate valid IDs', () => {
      const id = generator.getId();
      expect(validateId(id)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(generator.getId());
      }
      expect(ids.size).toBe(50);
    });

    it('should generate card IDs', () => {
      const id = generator.getCardId();
      expect(validateId(id)).toBe(true);
    });

    it('should generate box IDs', () => {
      const id = generator.getBoxId();
      expect(validateId(id)).toBe(true);
    });

    it('should generate base card IDs', () => {
      const id = generator.getBaseCardId();
      expect(validateId(id)).toBe(true);
    });
  });
});
