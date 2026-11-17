import { createServer } from 'vite';

const server = await createServer({
  configFile: 'vite.config.ts',
  configLoader: 'native',
  cacheDir: '../scratch/interactive-vite-cache',
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
});
await server.listen();
server.printUrls();
