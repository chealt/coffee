import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';
// import { visualizer } from 'rollup-plugin-visualizer';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  i18n: {
    locales: ['en', 'pl'],
    defaultLocale: 'en'
  },
  devToolbar: {
    enabled: false
  },
  integrations: [
    wasm()
  ],
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
    assetsInclude: ['**/*.onnx', '**/*.txt'],
    optimizeDeps: {
      exclude: ['onnxruntime-web', 'onnxruntime-common']
    },
    build: {
      sourcemap: true
    }
  },
  adapter: cloudflare()
});
