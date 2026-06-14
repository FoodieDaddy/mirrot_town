import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: { port: 5180, strictPort: true },
  publicDir: resolve(__dirname, '../../'), // Serve the whole repo as public, so /assets/... works directly
  build: {
    copyPublicDir: false
  }
});