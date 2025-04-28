import { defineConfig } from 'astro/config';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  integrations: [wasm()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  vite: {
    plugins: [wasm()],
    assetsInclude: ['**/*.onnx'],
    optimizeDeps: {
      exclude: ['onnxruntime-web']
    },
    build: {
      sourcemap: true
    }
  }
});
