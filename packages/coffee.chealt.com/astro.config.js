import cloudflare from '@astrojs/cloudflare';
import sentry from '@sentry/astro';
import { defineConfig, passthroughImageService } from 'astro/config';
// import { visualizer } from 'rollup-plugin-visualizer';

import supportedLanguages from './data/supportedLanguages.json' with { type: 'json' };

const locales = supportedLanguages.map(({ locale }) => locale);

// The Cloudflare plugin resolves the worker build with the "browser" condition, but Vite skips
// the legacy "browser" field in server environments. The AWS SDK needs both: the condition picks
// the browser exports of its dependencies, while the field swaps its own runtime config for the
// one that does not read from disk. With only the condition the two halves disagree, creating an
// S3 client throws, and image uploads never get a signed URL.
const awsSdkPackages = ['@aws-sdk/client-lambda', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'];

const mainFieldsWithBrowser = (mainFields) => ['browser', ...(mainFields ?? ['module', 'jsnext:main', 'jsnext'])];

const useBrowserFieldInWorker = {
  name: 'use-browser-field-in-worker',
  enforce: 'post',
  configEnvironment(name, options) {
    if (name !== 'ssr' || options.resolve?.mainFields?.includes('browser')) {
      return;
    }

    options.resolve ??= {};
    options.resolve.mainFields = mainFieldsWithBrowser(options.resolve.mainFields);

    // dev pre-bundles dependencies with esbuild, which does its own resolving and ignores
    // the field, so leave the SDK to the resolver above
    options.optimizeDeps ??= {};
    options.optimizeDeps.exclude = [...(options.optimizeDeps.exclude ?? []), ...awsSdkPackages];
  }
};

export default defineConfig({
  output: 'server',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  i18n: {
    locales,
    defaultLocale: supportedLanguages.find(({ isDefault }) => isDefault)?.locale || 'en',
    routing: {
      prefixDefaultLocale: true
    }
  },
  image: {
    service: passthroughImageService()
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
      useBrowserFieldInWorker
      // visualizer({
      //   open: process.env.ANALYZE
      // })
    ],
    assetsInclude: ['**/*.txt', '**/*.{jpeg,jpg,png,gif,svg,webp}'],
    build: {
      assetsInlineLimit: 0,
      cssMinify: 'esbuild',
      sourcemap: true
    },
    ssr: {
      external: [
        '@aws-sdk/client-s3',
        '@aws-sdk/client-lambda',
        '@aws-sdk/s3-request-presigner',
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
    },
    resolve: {
      alias: {
        buffer: 'node:buffer',
        crypto: 'node:crypto',
        stream: 'node:stream'
      }
    }
  },
  integrations: [
    sentry({
      enabled: Boolean(process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN),
      project: 'website',
      org: 'central-beans',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      clientInitPath: 'sentry.client.config.js',
      serverInitPath: null,
      autoInstrumentation: {
        requestHandler: false
      },
      telemetry: false
    })
  ],
  adapter: cloudflare()
});
