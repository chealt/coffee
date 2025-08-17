import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

// This placeholder will be replaced by the PWA plugin with a list of
// your static assets (JS, CSS, etc.) to precache.
precacheAndRoute(self.__WB_MANIFEST); // eslint-disable-line no-underscore-dangle

const pageStrategy = new NetworkFirst({
  cacheName: 'pages-cache',
  networkTimeoutSeconds: 5,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [200]
    })
  ]
});

registerRoute(({ request }) => {
  return request.url.endsWith('/') || request.url === '';
}, pageStrategy);

const assetStrategy = new StaleWhileRevalidate({
  cacheName: 'icon-cache',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [200]
    })
  ]
});

registerRoute(({ request }) => {
  return request.url.endsWith('favicon.svg');
}, assetStrategy);
