import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: fileURLToPath(new URL('../../assets', import.meta.url)),
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
