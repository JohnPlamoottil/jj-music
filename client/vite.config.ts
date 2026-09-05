import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';

// Load .env file manually
const envFile = path.resolve(__dirname, '.env');
const env = fs.existsSync(envFile)
  ? Object.fromEntries(
      fs.readFileSync(envFile, 'utf-8')
        .split('\n')
        .filter(line => line && !line.startsWith('#'))
        .map(line => line.split('=') as [string, string])
    )
  : {};

// The client never talks to storage or the database directly — only to /api.
// In development Vite proxies /api to the Express server so cookies stay
// same-origin (important: HTTP-only session cookies are used for auth).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // needed to open the dev server from an iPhone on the same wifi
    fs: {
      allow: [path.resolve(__dirname, '..'), path.resolve(process.env.HOME ?? '', 'Music')],
    },
    proxy: {
      '/api': {
        target: env.VITE_DEV_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
