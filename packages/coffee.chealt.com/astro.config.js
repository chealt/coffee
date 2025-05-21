import { defineConfig } from 'astro/config';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  i18n: {
    locales: ['en', 'pl'],
    defaultLocale: 'en'
  },
  integrations: [wasm()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  vite: {
    plugins: [wasm()],
    assetsInclude: ['**/*.onnx', '**/*.txt'],
    optimizeDeps: {
      exclude: ['onnxruntime-web', 'onnxruntime-common']
    },
    build: {
      sourcemap: true
    }
  }
});
