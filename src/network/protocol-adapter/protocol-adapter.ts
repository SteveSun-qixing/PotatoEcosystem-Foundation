/**
 * ProtocolAdapter 协议适配器
 * @module @chips/foundation/network/protocol-adapter/protocol-adapter
 */

import { httpClient } from '../http-client/http-client';
import { ChipsError, ErrorCodes } from '../../core/errors';

/**
 * 协议类型
 */
export type ProtocolType = 'http' | 'https' | 'file' | 'chips' | 'data';

/**
 * 资源请求
 */
export interface ResourceRequest {
  /** URL */
  url: string;
  /** 请求头 */
  headers?: Record<string, string>;
}

/**
 * 资源响应
 */
export interface ResourceResponse {
  /** 数据 */
  data: Uint8Array | string;
  /** MIME 类型 */
  mimeType: string;
  /** 状态码 */
  status: number;
}

/**
 * 协议处理器
 */
export type ProtocolHandler = (request: ResourceRequest) => Promise<ResourceResponse>;

/**
 * ProtocolAdapter 协议适配器
 */
export class ProtocolAdapter {
  private handlers: Map<ProtocolType, ProtocolHandler> = new Map();

  constructor() {
    // 注册默认处理器
    this.registerHandler('http', this.handleHTTP.bind(this));
    this.registerHandler('https', this.handleHTTP.bind(this));
    this.registerHandler('data', this.handleDataURL.bind(this));
  }

  /**
   * 注册协议处理器
   */
  registerHandler(protocol: ProtocolType, handler: ProtocolHandler): void {
    this.handlers.set(protocol, handler);
  }

  /**
   * 获取资源
   */
  async fetch(request: ResourceRequest): Promise<ResourceResponse> {
    const protocol = this.getProtocol(request.url);
    const handler = this.handlers.get(protocol);

    if (!handler) {
      throw new ChipsError(
        ErrorCodes.NOT_IMPLEMENTED,
        `Unsupported protocol: ${protocol}`
      );
    }

    return handler(request);
  }

  /**
   * 检查协议是否支持
   */
  isSupported(url: string): boolean {
    const protocol = this.getProtocol(url);
    return this.handlers.has(protocol);
  }

  /**
   * 获取协议类型
   */
  getProtocol(url: string): ProtocolType {
    if (url.startsWith('http://')) {
      return 'http';
    }
    if (url.startsWith('https://')) {
      return 'https';
    }
    if (url.startsWith('file://')) {
      return 'file';
    }
    if (url.startsWith('chips://')) {
      return 'chips';
    }
    if (url.startsWith('data:')) {
      return 'data';
    }
    // 默认 HTTP
    return 'http';
  }

  /**
   * HTTP/HTTPS 处理器
   */
  private async handleHTTP(request: ResourceRequest): Promise<ResourceResponse> {
    const response = await httpClient.get<ArrayBuffer>(request.url, {
      headers: request.headers,
      responseType: 'arrayBuffer',
    });

    const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';

    return {
      data: new Uint8Array(response.data),
      mimeType: contentType,
      status: response.status,
    };
  }

  /**
   * Data URL 处理器
   */
  private async handleDataURL(request: ResourceRequest): Promise<ResourceResponse> {
    const match = request.url.match(/^data:([^;]+);base64,(.+)$/);

    if (!match) {
      throw new ChipsError(ErrorCodes.INVALID_FORMAT, 'Invalid data URL');
    }

    const [, mimeType, base64] = match;
    if (!mimeType || !base64) {
      throw new ChipsError(ErrorCodes.INVALID_FORMAT, 'Invalid data URL');
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return {
      data: bytes,
      mimeType,
      status: 200,
    };
  }
}

/**
 * 全局协议适配器实例
 */
export const protocolAdapter = new ProtocolAdapter();
