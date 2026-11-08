import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    server: isDev ? {
      port: 5174, // Свой порт для лендинга
      proxy: {
        '/api': { target: 'http://localhost:5000', changeOrigin: true },
      },
    } : undefined,
  };
});