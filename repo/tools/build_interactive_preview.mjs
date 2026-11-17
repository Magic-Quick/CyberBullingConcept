import { build } from 'vite';

await build({
  configFile: 'vite.config.ts',
  configLoader: 'native',
  cacheDir: '../scratch/interactive-vite-cache',
  build: {
    outDir: '../media/interactive/protocol-preview',
    emptyOutDir: false,
    assetsInlineLimit: () => true,
    rollupOptions: { input: 'interactive-preview.html' },
  },
});
