import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_BASE_URL
  ? new URL(process.env.VITE_API_BASE_URL).origin
  : 'http://localhost:8081';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true }
    }
  },
  preview: { port: 3001, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          http: ['axios']
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false
  }
});
