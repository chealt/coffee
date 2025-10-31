/* eslint-disable no-console */
const uploadFile = async ({ filename, fileData, getSignedUrl }) => {
  const response = await fetch(getSignedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({ filename, contentType: fileData.type })
  });

  if (!response.ok) {
    throw new Error('Could not get signed URL');
  }

  const { url } = await response.json();

  const renamedFile = new File([fileData], filename, { type: fileData.type });

  const uploadResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': renamedFile.type
    },
    body: renamedFile
  });

  return uploadResponse;
};

const CACHE_NAME = 'collection-images-cache-v1';

self.addEventListener('install', (event) => {
  console.info('SW: Install event');

  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.info('SW: Activate event');

  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'cache-image') {
    const { filename, fileData, getSignedUrl, imageUploadUrls, buffer } = event.data;

    console.info(`SW: Received image "${filename}"`);

    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => {
          console.info(`SW: Caching image with MIME type "${fileData.type}"`);

          return Promise.all(
            imageUploadUrls.map((imageUrl) => {
              // must create a new Response for all cache items
              const responseToCache = new Response(buffer, {
                headers: {
                  'Access-Control-Allow-Origin': '*',
                  'Content-Type': fileData.type,
                  'Content-Length': buffer.byteLength
                }
              });

              return cache.put(`${imageUrl.slice(0, -5)}${filename}${imageUrl.slice(-5)}`, responseToCache);
            })
          );
        })
        .then(() => console.info('✅ SW: Image cached successfully!'))
        .then(() => {
          console.info('SW: Uploading image...');

          return uploadFile({ filename, fileData, getSignedUrl });
        })
        .then((response) => {
          if (response.ok) {
            console.info('✅ SW: Image uploaded successfully!');

            return response;
          }

          console.error('SW: Image upload failed:', response);

          // retry once
          return uploadFile({ filename, fileData, getSignedUrl });
        })
        .catch((err) => console.error('SW: Caching failed:', err))
    );
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'GET' && url.host === 'collection-images.centralbeans.com') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.info('SW: Serving image from cache!', event.request.url);

          return cachedResponse;
        }

        return fetch(event.request);
      })
    );
  }
});
