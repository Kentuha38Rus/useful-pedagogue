import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,  // порт для админ-панели
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // бэкенд
        changeOrigin: true,
      },
    },
  },
});