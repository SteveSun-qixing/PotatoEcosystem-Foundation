/**
 * FormatConverter 测试
 */

import { describe, it, expect } from 'vitest';
import {
  FormatConverter,
  formatConverter,
} from '../../../src/file/format-converter';

describe('FormatConverter', () => {
  const converter = new FormatConverter();

  describe('YAML/JSON conversion', () => {
    it('should convert YAML to JSON', () => {
      const yaml = 'name: test\nvalue: 123';
      const json = converter.yamlToJson(yaml);
      expect(JSON.parse(json)).toEqual({ name: 'test', value: 123 });
    });

    it('should convert JSON to YAML', () => {
      const json = '{"name":"test","value":123}';
      const yaml = converter.jsonToYaml(json);
      expect(yaml).toContain('name: test');
      expect(yaml).toContain('value: 123');
    });

    it('should pretty print JSON', () => {
      const yaml = 'name: test';
      const json = converter.yamlToJson(yaml, { pretty: true });
      expect(json).toContain('\n');
    });
  });

  describe('string/bytes conversion', () => {
    it('should convert string to bytes', () => {
      const str = 'Hello World';
      const bytes = converter.stringToBytes(str);
      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it('should convert bytes to string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const str = converter.bytesToString(bytes);
      expect(str).toBe('Hello');
    });

    it('should round-trip string conversion', () => {
      const original = '你好世界';
      const bytes = converter.stringToBytes(original);
      const str = converter.bytesToString(bytes);
      expect(str).toBe(original);
    });
  });

  describe('ArrayBuffer/Uint8Array conversion', () => {
    it('should convert ArrayBuffer to Uint8Array', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setUint8(0, 1);
      view.setUint8(1, 2);

      const bytes = converter.arrayBufferToUint8Array(buffer);
      expect(bytes[0]).toBe(1);
      expect(bytes[1]).toBe(2);
    });

    it('should convert Uint8Array to ArrayBuffer', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      const buffer = converter.uint8ArrayToArrayBuffer(bytes);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(4);
    });
  });

  describe('Base64 encoding', () => {
    it('should encode string to Base64', () => {
      const base64 = converter.toBase64('Hello World');
      expect(base64).toBe('SGVsbG8gV29ybGQ=');
    });

    it('should encode bytes to Base64', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const base64 = converter.toBase64(bytes);
      expect(base64).toBe('SGVsbG8=');
    });

    it('should decode Base64 to bytes', () => {
      const bytes = converter.fromBase64('SGVsbG8=');
      expect(converter.bytesToString(bytes)).toBe('Hello');
    });

    it('should decode Base64 to string', () => {
      const str = converter.fromBase64ToString('SGVsbG8gV29ybGQ=');
      expect(str).toBe('Hello World');
    });

    it('should support URL-safe Base64', () => {
      // 包含 + 和 / 的数据
      const data = new Uint8Array([0xfb, 0xff, 0xfe]);
      const base64 = converter.toBase64(data, { urlSafe: true });
      expect(base64).not.toContain('+');
      expect(base64).not.toContain('/');
      expect(base64).not.toContain('=');

      const decoded = converter.fromBase64(base64, { urlSafe: true });
      expect(decoded).toEqual(data);
    });
  });

  describe('Hex encoding', () => {
    it('should encode to hex', () => {
      const bytes = new Uint8Array([0x00, 0x0f, 0xff]);
      const hex = converter.toHex(bytes);
      expect(hex).toBe('000fff');
    });

    it('should decode from hex', () => {
      const bytes = converter.fromHex('000fff');
      expect(bytes).toEqual(new Uint8Array([0x00, 0x0f, 0xff]));
    });

    it('should round-trip hex conversion', () => {
      const original = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const hex = converter.toHex(original);
      const decoded = converter.fromHex(hex);
      expect(decoded).toEqual(original);
    });
  });

  describe('Data URL', () => {
    it('should create data URL', () => {
      const data = new Uint8Array([1, 2, 3]);
      const dataUrl = converter.toDataUrl(data, 'application/octet-stream');
      expect(dataUrl).toMatch(/^data:application\/octet-stream;base64,/);
    });

    it('should parse data URL', () => {
      const dataUrl = 'data:text/plain;base64,SGVsbG8=';
      const result = converter.fromDataUrl(dataUrl);
      expect(result.mimeType).toBe('text/plain');
      expect(converter.bytesToString(result.data)).toBe('Hello');
    });

    it('should throw for invalid data URL', () => {
      expect(() => converter.fromDataUrl('invalid')).toThrow();
    });
  });

  describe('byte operations', () => {
    it('should concat bytes', () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4]);
      const c = new Uint8Array([5]);
      const result = converter.concatBytes(a, b, c);
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('should compare bytes', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3]);
      const c = new Uint8Array([1, 2, 4]);
      const d = new Uint8Array([1, 2]);

      expect(converter.compareBytes(a, b)).toBe(true);
      expect(converter.compareBytes(a, c)).toBe(false);
      expect(converter.compareBytes(a, d)).toBe(false);
    });
  });
});
