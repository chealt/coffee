import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';
// import { visualizer } from 'rollup-plugin-visualizer';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  output: 'server',
  i18n: {
    locales: ['en', 'pl'],
    defaultLocale: 'en'
  },
  devToolbar: {
    enabled: false
  },
  integrations: [wasm()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  vite: {
    plugins: [
      // visualizer({
      //   open: process.env.ANALYZE
      // })
    ],
    assetsInclude: ['**/*.onnx', '**/*.txt', '**/*.{jpeg,jpg,png,gif,svg,webp}'],
    optimizeDeps: {
      exclude: ['onnxruntime-web', 'onnxruntime-common']
    },
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
