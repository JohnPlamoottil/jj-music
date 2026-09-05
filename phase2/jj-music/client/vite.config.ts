import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client never talks to storage or the database directly — only to /api.
// In development Vite proxies /api to the Express server so cookies stay
// same-origin (important: HTTP-only session cookies are used for auth).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // needed to open the dev server from an iPhone on the same wifi
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
