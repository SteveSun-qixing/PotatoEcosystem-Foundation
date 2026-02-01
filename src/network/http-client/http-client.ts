/**
 * HTTPClient HTTP客户端
 * @module @chips/foundation/network/http-client/http-client
 */

import { NetworkError } from '../../core/errors';

/**
 * HTTP 请求方法
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP 请求选项
 */
export interface HTTPRequestOptions {
  /** 请求方法 */
  method?: HTTPMethod;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: unknown;
  /** 查询参数 */
  params?: Record<string, string | number | boolean>;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否携带凭证 */
  credentials?: RequestCredentials;
  /** 响应类型 */
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
  /** AbortSignal */
  signal?: AbortSignal;
}

/**
 * HTTP 响应
 */
export interface HTTPResponse<T = unknown> {
  /** 响应数据 */
  data: T;
  /** 状态码 */
  status: number;
  /** 状态文本 */
  statusText: string;
  /** 响应头 */
  headers: Headers;
  /** 原始响应 */
  response: Response;
}

/**
 * 请求拦截器
 */
export type RequestInterceptor = (
  url: string,
  options: HTTPRequestOptions
) => Promise<[string, HTTPRequestOptions]>;

/**
 * 响应拦截器
 */
export type ResponseInterceptor = <T>(response: HTTPResponse<T>) => Promise<HTTPResponse<T>>;

/**
 * HTTPClient 配置
 */
export interface HTTPClientConfig {
  /** 基础 URL */
  baseURL?: string;
  /** 默认超时 */
  timeout?: number;
  /** 默认请求头 */
  headers?: Record<string, string>;
}

/**
 * HTTPClient HTTP客户端
 */
export class HTTPClient {
  private config: HTTPClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(config?: HTTPClientConfig) {
    this.config = {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    };
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * 发送请求
   */
  async request<T = unknown>(
    url: string,
    options: HTTPRequestOptions = {}
  ): Promise<HTTPResponse<T>> {
    let finalUrl = url;
    let finalOptions = options;

    // 应用请求拦截器
    for (const interceptor of this.requestInterceptors) {
      [finalUrl, finalOptions] = await interceptor(finalUrl, finalOptions);
    }

    // 构建完整 URL
    const fullUrl = this.buildUrl(finalUrl, finalOptions.params);

    // 构建请求配置
    const fetchOptions: RequestInit = {
      method: finalOptions.method ?? 'GET',
      headers: this.mergeHeaders(finalOptions.headers),
      credentials: finalOptions.credentials,
      signal: finalOptions.signal,
    };

    // 处理请求体
    if (finalOptions.body !== undefined) {
      fetchOptions.body = this.serializeBody(finalOptions.body);
    }

    // 处理超时
    const timeout = finalOptions.timeout ?? this.config.timeout;
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;

    if (timeout && !finalOptions.signal) {
      timeoutId = setTimeout(() => controller.abort(), timeout);
      fetchOptions.signal = controller.signal;
    }

    try {
      const response = await fetch(fullUrl, fetchOptions);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // 解析响应
      const data = await this.parseResponse<T>(response, finalOptions.responseType);

      let result: HTTPResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        response,
      };

      // 应用响应拦截器
      for (const interceptor of this.responseInterceptors) {
        result = await interceptor(result);
      }

      // 检查响应状态
      if (!response.ok) {
        throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`, {
          status: response.status,
          data,
        });
      }

      return result;
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (error instanceof NetworkError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('Request timeout', { timeout });
      }

      throw new NetworkError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { url: fullUrl },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * GET 请求
   */
  async get<T = unknown>(
    url: string,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH 请求
   */
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(
    url: string,
    options?: Omit<HTTPRequestOptions, 'method'>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * 构建完整 URL
   */
  private buildUrl(url: string, params?: Record<string, string | number | boolean>): string {
    let fullUrl = url;

    // 添加 baseURL
    if (this.config.baseURL && !url.startsWith('http')) {
      fullUrl = `${this.config.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // 添加查询参数
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        searchParams.append(key, String(value));
      }
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + searchParams.toString();
    }

    return fullUrl;
  }

  /**
   * 合并请求头
   */
  private mergeHeaders(headers?: Record<string, string>): Headers {
    const merged = new Headers(this.config.headers);
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        merged.set(key, value);
      }
    }
    return merged;
  }

  /**
   * 序列化请求体
   */
  private serializeBody(body: unknown): BodyInit {
    if (
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      typeof body === 'string'
    ) {
      return body;
    }
    return JSON.stringify(body);
  }

  /**
   * 解析响应
   */
  private async parseResponse<T>(
    response: Response,
    responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer'
  ): Promise<T> {
    const contentType = response.headers.get('Content-Type') ?? '';

    switch (responseType) {
      case 'text':
        return (await response.text()) as T;
      case 'blob':
        return (await response.blob()) as T;
      case 'arrayBuffer':
        return (await response.arrayBuffer()) as T;
      case 'json':
        return (await response.json()) as T;
      default:
        // 自动检测
        if (contentType.includes('application/json')) {
          return (await response.json()) as T;
        }
        return (await response.text()) as T;
    }
  }
}

/**
 * 全局 HTTP 客户端实例
 */
export const httpClient = new HTTPClient();
