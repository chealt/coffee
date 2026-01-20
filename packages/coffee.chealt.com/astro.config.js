import cloudflare from '@astrojs/cloudflare';
import sentry from '@sentry/astro';
import { defineConfig } from 'astro/config';
// import { visualizer } from 'rollup-plugin-visualizer';

import supportedLanguages from './data/supportedLanguages.json';

const locales = supportedLanguages.map(({ locale }) => locale);

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  output: 'server',
  i18n: {
    locales,
    defaultLocale: supportedLanguages.find(({ isDefault }) => isDefault)?.locale || 'en',
    routing: {
      prefixDefaultLocale: true
    }
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
    ssr: {
      external: [
        'async_hooks',
        'buffer',
        'child_process',
        'crypto',
        'diagnostics_channel',
        'events',
        'fs',
        'module',
        'node:async_hooks',
        'node:child_process',
        'node:diagnostics_channel',
        'node:events',
        'node:fs',
        'node:http',
        'node:https',
        'node:inspector',
        'node:module',
        'node:net',
        'node:os',
        'node:path',
        'node:readline',
        'node:stream',
        'node:tls',
        'node:util',
        'node:worker_threads',
        'node:zlib',
        'path',
        'stream',
        'url',
        'util',
        'worker_threads'
      ]
    }
  },
  integrations: [
    sentry({
      project: 'website',
      org: 'central-beans',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      clientInitPath: 'sentry.client.config.js',
      serverInitPath: null,
      autoInstrumentServer: false,
      telemetry: false
    })
  ],
  adapter: !isDev
    ? cloudflare({
        imageService: 'passthrough'
      })
    : undefined
});
