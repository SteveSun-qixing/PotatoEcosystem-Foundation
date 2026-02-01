/**
 * Chips Foundation - 薯片公共基础层
 *
 * 为薯片生态提供通用功能模块、运行环境和依赖库
 *
 * @packageDocumentation
 * @module @chips/foundation
 */

// ============================================================================
// 版本信息
// ============================================================================

/**
 * 版本号
 */
export const VERSION = '1.0.0';

/**
 * 版本信息
 */
export const VERSION_INFO = {
  major: 1,
  minor: 0,
  patch: 0,
  prerelease: '',
  build: '',
} as const;

// ============================================================================
// 核心模块导出
// ============================================================================

// 核心类型、接口、错误、工具
export * from './core';

// ============================================================================
// 系统服务模块导出
// ============================================================================

export * from './system/data-serializer';
export * from './system/log-system';
export * from './system/i18n-system';
export * from './system/config-manager';

// ============================================================================
// 文件处理模块导出
// ============================================================================

export * from './file/zip-processor';
export * from './file/file-identifier';
export * from './file/format-converter';

// ============================================================================
// 网络通信模块导出（阶段4完成后取消注释）
// ============================================================================

// export * from './network/http-client';
// export * from './network/download-manager';
// export * from './network/cache-manager';
// export * from './network/protocol-adapter';

// ============================================================================
// 界面组件模块导出（阶段5完成后取消注释）
// ============================================================================

// export * from './ui/controls';
// export * from './ui/window-manager';
// export * from './ui/drag-drop-system';
// export * from './ui/iframe-wrapper';

// ============================================================================
// 文本处理模块导出（阶段6完成后取消注释）
// ============================================================================

// export * from './text/rich-text-renderer';
// export * from './text/markdown-parser';
// export * from './text/code-highlighter';
// export * from './text/text-editor';

// ============================================================================
// 媒体组件模块导出（阶段7完成后取消注释）
// ============================================================================

// export * from './media/video-player';
// export * from './media/audio-player';
// export * from './media/image-viewer';
// export * from './media/model-3d-renderer';

// ============================================================================
// 核心运行环境模块导出（阶段8完成后取消注释）
// ============================================================================

// export * from './runtime/runtime-manager';
// export * from './runtime/electron-framework';
// export * from './runtime/chromium-core';

// ============================================================================
// 卡片渲染模块导出（阶段9完成后取消注释）
// ============================================================================

// export * from './renderer/card-renderer';
// export * from './renderer/base-card-renderers';
// export * from './renderer/box-renderer';
// export * from './renderer/theme-engine';
