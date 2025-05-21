import sentry from '@sentry/astro';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import wasm from 'vite-plugin-wasm';

const { SENTRY_AUTH_TOKEN } = loadEnv(process.env.SENTRY_AUTH_TOKEN, process.cwd(), '');

if (!SENTRY_AUTH_TOKEN) {
  throw new Error('SENTRY_AUTH_TOKEN is not defined');
}

export default defineConfig({
  i18n: {
    locales: ['en', 'pl'],
    defaultLocale: 'en'
  },
  integrations: [wasm(),
    sentry({
      dsn: 'https://86a0316fcf0bd4e08d452983cacd7be9@o4509361329995776.ingest.de.sentry.io/4509361331830864',
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      // Setting this option to true will send default PII data to Sentry.
      // For example, automatic IP address collection on events
      sendDefaultPii: true,
      sourceMapsUploadOptions: {
        project: 'javascript-astro',
        authToken: SENTRY_AUTH_TOKEN
      }
    })
  ],
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
