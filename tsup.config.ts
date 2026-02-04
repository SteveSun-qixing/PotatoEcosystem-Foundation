import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: false, // 禁用 tree shaking，确保所有导出都包含
  minify: false,
  external: ['electron'],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
