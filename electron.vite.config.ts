/**
 * Electron Vite 配置文件
 * @module @chips/foundation/electron.vite.config
 *
 * 为 Foundation 的 Electron 运行时提供构建配置
 */

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
  /**
   * 主进程配置
   */
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: resolve(__dirname, 'src/runtime/desktop-launcher/main-entry.ts'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@core': resolve(__dirname, 'src/core'),
        '@runtime': resolve(__dirname, 'src/runtime'),
        '@system': resolve(__dirname, 'src/system'),
        '@file': resolve(__dirname, 'src/file'),
        '@network': resolve(__dirname, 'src/network'),
        '@ui': resolve(__dirname, 'src/ui'),
        '@text': resolve(__dirname, 'src/text'),
        '@media': resolve(__dirname, 'src/media'),
        '@renderer': resolve(__dirname, 'src/renderer'),
      },
    },
  },

  /**
   * 预加载脚本配置
   */
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: resolve(__dirname, 'src/runtime/desktop-launcher/preload-entry.ts'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@runtime': resolve(__dirname, 'src/runtime'),
      },
    },
  },

  /**
   * 渲染进程配置（用于开发测试）
   */
  renderer: {
    build: {
      outDir: 'dist/renderer',
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  },
});
