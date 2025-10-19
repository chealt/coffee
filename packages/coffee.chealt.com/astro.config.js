import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

// import { visualizer } from 'rollup-plugin-visualizer';
import locales from './data/supportedLanguages.json';

export default defineConfig({
  output: 'server',
  i18n: {
    locales,
    defaultLocale: 'en',
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
    }
  },
  adapter: cloudflare({
    imageService: 'passthrough'
  })
});
