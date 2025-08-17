import cloudflare from '@astrojs/cloudflare';
import AstroPWA from '@vite-pwa/astro';
import { defineConfig } from 'astro/config';
// import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  output: 'server',
  i18n: {
    locales: ['en', 'pl'],
    defaultLocale: 'en'
  },
  devToolbar: {
    enabled: false
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  integrations: [
    // eslint-disable-next-line new-cap
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        globIgnores: ['_worker.js/**/*'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [200]
              }
            }
          }
        ]
      },
      manifest: false,
      devOptions: {
        enabled: true
      }
    })
  ],
  vite: {
    plugins: [
      // visualizer({
      //   open: process.env.ANALYZE
      // })
    ],
    assetsInclude: ['**/*.txt', '**/*.{jpeg,jpg,png,gif,svg,webp}'],
    build: {
      sourcemap: true,
      assetsInlineLimit: 0
    },
    define: {
      'process.env.TURSO_DATABASE_URL_ATTILABARTHA': process.env.TURSO_DATABASE_URL_ATTILABARTHA
    }
  },
  adapter: cloudflare({
    imageService: 'passthrough'
  })
});
