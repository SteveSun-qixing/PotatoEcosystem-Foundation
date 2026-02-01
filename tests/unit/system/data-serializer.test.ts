/**
 * DataSerializer 测试
 */

import { describe, it, expect } from 'vitest';
import {
  DataSerializer,
  dataSerializer,
  parseYAML,
  stringifyYAML,
  parseJSON,
  stringifyJSON,
  validateSchema,
} from '../../../src/system/data-serializer';

describe('DataSerializer', () => {
  describe('YAML Parser', () => {
    it('should parse simple YAML', () => {
      const yaml = `
name: test
value: 123
`;
      const result = parseYAML<{ name: string; value: number }>(yaml);
      expect(result.name).toBe('test');
      expect(result.value).toBe(123);
    });

    it('should parse nested YAML', () => {
      const yaml = `
config:
  setting1: true
  setting2: value
`;
      const result = parseYAML<{ config: { setting1: boolean; setting2: string } }>(yaml);
      expect(result.config.setting1).toBe(true);
      expect(result.config.setting2).toBe('value');
    });

    it('should parse YAML arrays', () => {
      const yaml = `
items:
  - a
  - b
  - c
`;
      const result = parseYAML<{ items: string[] }>(yaml);
      expect(result.items).toEqual(['a', 'b', 'c']);
    });

    it('should stringify to YAML', () => {
      const data = { name: 'test', value: 123 };
      const result = stringifyYAML(data);
      expect(result).toContain('name: test');
      expect(result).toContain('value: 123');
    });

    it('should throw on invalid YAML', () => {
      const invalidYaml = `
invalid: [
`;
      expect(() => parseYAML(invalidYaml)).toThrow();
    });
  });

  describe('JSON Parser', () => {
    it('should parse simple JSON', () => {
      const json = '{"name":"test","value":123}';
      const result = parseJSON<{ name: string; value: number }>(json);
      expect(result.name).toBe('test');
      expect(result.value).toBe(123);
    });

    it('should stringify to JSON', () => {
      const data = { name: 'test', value: 123 };
      const result = stringifyJSON(data);
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should stringify with pretty option', () => {
      const data = { name: 'test' };
      const result = stringifyJSON(data, { pretty: true });
      expect(result).toContain('\n');
    });

    it('should throw on invalid JSON', () => {
      expect(() => parseJSON('invalid')).toThrow();
    });
  });

  describe('Schema Validator', () => {
    it('should validate simple type', () => {
      const schema = { type: 'string' };
      const result = validateSchema('test', schema);
      expect(result.valid).toBe(true);
    });

    it('should fail on type mismatch', () => {
      const schema = { type: 'number' };
      const result = validateSchema('string', schema);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]?.keyword).toBe('type');
    });

    it('should validate required properties', () => {
      const schema = {
        type: 'object',
        required: ['name'],
      };

      const validResult = validateSchema({ name: 'test' }, schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = validateSchema({}, schema);
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate nested properties', () => {
      const schema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
            },
          },
        },
      };

      const result = validateSchema(
        { config: { enabled: true } },
        schema
      );
      expect(result.valid).toBe(true);
    });

    it('should validate minimum and maximum', () => {
      const schema = { type: 'number', minimum: 0, maximum: 100 };

      expect(validateSchema(50, schema).valid).toBe(true);
      expect(validateSchema(-1, schema).valid).toBe(false);
      expect(validateSchema(101, schema).valid).toBe(false);
    });

    it('should validate enum', () => {
      const schema = { enum: ['a', 'b', 'c'] };

      expect(validateSchema('a', schema).valid).toBe(true);
      expect(validateSchema('d', schema).valid).toBe(false);
    });
  });

  describe('DataSerializer class', () => {
    const serializer = new DataSerializer();

    it('should auto-detect JSON format', () => {
      const result = serializer.autoParse<{ name: string }>('{"name":"test"}');
      expect(result.name).toBe('test');
    });

    it('should auto-detect YAML format', () => {
      const result = serializer.autoParse<{ name: string }>('name: test');
      expect(result.name).toBe('test');
    });

    it('should parse with generic parse method', () => {
      const json = serializer.parse<{ a: number }>('{"a":1}', 'json');
      expect(json.a).toBe(1);

      const yaml = serializer.parse<{ a: number }>('a: 1', 'yaml');
      expect(yaml.a).toBe(1);
    });

    it('should stringify with generic stringify method', () => {
      const data = { a: 1 };

      const json = serializer.stringify(data, 'json');
      expect(json).toBe('{"a":1}');

      const yaml = serializer.stringify(data, 'yaml');
      expect(yaml).toContain('a: 1');
    });
  });
});
