import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [
    viteSingleFile({ useRecommendedBuildConfig: false }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5174,
    fs: {
      allow: ['..'],
    },
  },
  build: {
    target: 'es2020',
    modulePreload: false,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
});
