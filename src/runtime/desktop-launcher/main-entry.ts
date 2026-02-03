/**
 * Electron 主进程入口模板
 * @module @chips/foundation/runtime/desktop-launcher/main-entry
 *
 * 提供 Electron 主进程的入口模板
 * 上层应用可以直接使用此入口，或参考此模板创建自定义入口
 */

import { launchDesktopApp, DesktopLauncher } from './desktop-launcher';
import type { DesktopAppConfig } from './types';

// ============================================================================
// 主进程入口
// ============================================================================

/**
 * 应用启动器实例
 */
let launcher: DesktopLauncher | null = null;

/**
 * 创建默认配置
 * @param overrides 配置覆盖
 * @returns 完整配置
 */
export function createDefaultConfig(overrides: Partial<DesktopAppConfig>): DesktopAppConfig {
  return {
    appId: 'com.chips.app',
    name: 'Chips Application',
    version: '1.0.0',
    window: {
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: 'Chips Application',
      autoHideMenuBar: true,
      center: true,
    },
    isDev: process.env.NODE_ENV === 'development',
    devServerUrl: process.env['ELECTRON_RENDERER_URL'] ?? 'http://localhost:5173',
    singleInstance: true,
    logLevel: 'info',
    ...overrides,
  };
}

/**
 * 启动应用
 * @param config 应用配置
 * @returns 启动器实例
 */
export async function startApp(config: DesktopAppConfig): Promise<DesktopLauncher> {
  if (launcher) {
    throw new Error('Application is already running');
  }

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    // eslint-disable-next-line no-console
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // 启动应用
  launcher = await launchDesktopApp(config);

  return launcher;
}

/**
 * 获取启动器实例
 */
export function getLauncher(): DesktopLauncher | null {
  return launcher;
}

/**
 * 停止应用
 */
export function stopApp(): void {
  if (launcher) {
    launcher.quit();
    launcher = null;
  }
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例代码（供参考）
 *
 * ```typescript
 * // main.ts - 上层应用主进程入口
 * import { startApp, createDefaultConfig } from '@chips/foundation/runtime/desktop-launcher';
 * import { join } from 'path';
 *
 * // 创建配置
 * const config = createDefaultConfig({
 *   appId: 'com.chips.editor',
 *   name: '薯片卡片编辑器',
 *   version: '1.0.0',
 *   window: {
 *     width: 1400,
 *     height: 900,
 *     minWidth: 1000,
 *     minHeight: 700,
 *     title: '薯片卡片编辑器',
 *   },
 *   preload: join(__dirname, '../preload/index.js'),
 *   productionHtml: join(__dirname, '../renderer/index.html'),
 * });
 *
 * // 启动应用
 * startApp(config).then((launcher) => {
 *   console.log('Application started');
 *
 *   // 注册自定义 IPC 处理器
 *   launcher.registerIpcHandler('custom:action', async (event, data) => {
 *     console.log('Received custom action:', data);
 *     return { success: true };
 *   });
 * });
 * ```
 */

// ============================================================================
// 默认导出
// ============================================================================

export { launchDesktopApp, DesktopLauncher } from './desktop-launcher';
export type { DesktopAppConfig, WindowConfig, MenuConfig, TrayConfig } from './types';
