/**
 * FormatConverter 格式转换器
 * @module @chips/foundation/file/format-converter/format-converter
 */

import { dataSerializer } from '../../system/data-serializer/data-serializer';

/**
 * 转换选项
 */
export interface ConvertOptions {
  /** 是否美化输出 */
  pretty?: boolean;
  /** 缩进空格数 */
  indent?: number;
}

/**
 * Base64 编码选项
 */
export interface Base64Options {
  /** 是否 URL 安全 */
  urlSafe?: boolean;
}

/**
 * FormatConverter 格式转换器
 */
export class FormatConverter {
  /**
   * YAML 转 JSON
   */
  yamlToJson(yaml: string, options?: ConvertOptions): string {
    const data = dataSerializer.parseYAML(yaml);
    return dataSerializer.stringifyJSON(data, {
      pretty: options?.pretty ?? false,
      indent: options?.indent ?? 2,
    });
  }

  /**
   * JSON 转 YAML
   */
  jsonToYaml(json: string, options?: ConvertOptions): string {
    const data = dataSerializer.parseJSON(json);
    return dataSerializer.stringifyYAML(data, {
      indent: options?.indent ?? 2,
    });
  }

  /**
   * 字符串转 Uint8Array
   */
  stringToBytes(str: string, _encoding: 'utf-8' | 'utf-16' = 'utf-8'): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  /**
   * Uint8Array 转字符串
   */
  bytesToString(bytes: Uint8Array, encoding: 'utf-8' | 'utf-16' = 'utf-8'): string {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(bytes);
  }

  /**
   * ArrayBuffer 转 Uint8Array
   */
  arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
    return new Uint8Array(buffer);
  }

  /**
   * Uint8Array 转 ArrayBuffer
   */
  uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }

  /**
   * Base64 编码
   */
  toBase64(input: string | Uint8Array, options?: Base64Options): string {
    const bytes = typeof input === 'string' ? this.stringToBytes(input) : input;
    const binary = String.fromCharCode(...bytes);
    let base64 = btoa(binary);

    if (options?.urlSafe) {
      base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    return base64;
  }

  /**
   * Base64 解码
   */
  fromBase64(base64: string, options?: Base64Options): Uint8Array {
    let input = base64;

    if (options?.urlSafe) {
      input = input.replace(/-/g, '+').replace(/_/g, '/');
      // 补齐 padding
      const pad = input.length % 4;
      if (pad) {
        input += '='.repeat(4 - pad);
      }
    }

    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Base64 解码为字符串
   */
  fromBase64ToString(base64: string, options?: Base64Options): string {
    const bytes = this.fromBase64(base64, options);
    return this.bytesToString(bytes);
  }

  /**
   * Hex 编码
   */
  toHex(input: string | Uint8Array): string {
    const bytes = typeof input === 'string' ? this.stringToBytes(input) : input;
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Hex 解码
   */
  fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  /**
   * 数据 URL 编码
   */
  toDataUrl(data: Uint8Array, mimeType: string): string {
    const base64 = this.toBase64(data);
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * 数据 URL 解码
   */
  fromDataUrl(dataUrl: string): { data: Uint8Array; mimeType: string } {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URL');
    }

    const [, mimeType, base64] = match;
    if (!mimeType || !base64) {
      throw new Error('Invalid data URL');
    }

    return {
      data: this.fromBase64(base64),
      mimeType,
    };
  }

  /**
   * 合并 Uint8Array
   */
  concatBytes(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }

    return result;
  }

  /**
   * 比较两个 Uint8Array
   */
  compareBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }
}

/**
 * 全局格式转换器实例
 */
export const formatConverter = new FormatConverter();
