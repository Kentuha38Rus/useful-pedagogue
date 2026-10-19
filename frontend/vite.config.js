import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'service-worker.js',
        registerType: 'autoUpdate',
        injectRegister: 'auto',

        manifest: {
          name: 'Полезный педагог',
          short_name: 'Педагог',
          description: 'Экосистема для детского центра',
          start_url: './',
          scope: './',
          display: 'standalone',
          background_color: '#F5F0E1',
          theme_color: '#6B6B3D',
          icons: [
            { src: 'icons/turtle-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'icons/turtle-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },

        includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],

        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },

        devOptions: {
          enabled: isDev,
          type: 'module',
          navigateFallback: 'index.html',
        },
      }),
    ],

    // В проде — '/', в dev — как задано в env
    base: env.VITE_BASE_PATH || '/',

    css: {
      preprocessorOptions: {
        scss: {},
      },
    },

    server: isDev ? {
      port: 5173,
      proxy: {
        '/api': { target: 'http://localhost:5000', changeOrigin: true },
        '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true },
      },
    } : undefined,
  };
});