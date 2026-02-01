import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@chips/foundation': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@system': resolve(__dirname, './src/system'),
      '@file': resolve(__dirname, './src/file'),
      '@network': resolve(__dirname, './src/network'),
      '@ui': resolve(__dirname, './src/ui'),
      '@text': resolve(__dirname, './src/text'),
      '@media': resolve(__dirname, './src/media'),
      '@runtime': resolve(__dirname, './src/runtime'),
      '@renderer': resolve(__dirname, './src/renderer'),
    },
  },
});
