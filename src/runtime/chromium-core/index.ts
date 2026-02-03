/**
 * ChromiumCore 模块导出
 * @module @chips/foundation/runtime/chromium-core
 *
 * 提供 Chromium 核心功能的完整导出
 */

// 类型导出
export type {
  // WebView 配置
  WebViewConfig,
  // WebView 事件
  WebViewLoadEvent,
  WebViewLoadFailEvent,
  WebViewConsoleMessageEvent,
  WebViewNewWindowEvent,
  WebViewPermissionRequestEvent,
  WebViewEventType,
  // WebView 接口
  IWebView,
  FindInPageOptions,
  PrintToPDFOptions,
  // ChromiumCore 接口
  IChromiumCore,
  // IPC 相关
  IPCMessage,
  IPCHandler,
} from './types';

// 实现导出
export { ChromiumCore, chromiumCore, WebViewWrapper } from './chromium-core';
