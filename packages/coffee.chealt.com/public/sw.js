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

const setItem = async (key, value) => {
  const response = await fetch('/api/storage/set-item.json', {
    method: 'POST',
    body: JSON.stringify({ key, value })
  });

  if (!response.ok) {
    throw new Error(`Could not set item: "${await response.text()}"`);
  }

  return response.json();
};

const cacheName = 'collection-images-cache-v1';

const addImageToCollection = 'chealt-add-image-to-collection';
const addImageToCollectionItem = 'chealt-add-image-to-collection-item';

self.addEventListener('install', (event) => {
  console.info('SW: Install event');

  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.info('SW: Activate event');

  event.waitUntil(self.clients.claim());
});

const uploadAndCacheImage = (event) => {
  const { filename, fileData, getSignedUrl, imageUploadUrls, buffer } = event.data;

  console.info(`SW: Received image "${filename}"`);

  event.waitUntil(
    caches
      .open(cacheName)
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
};

const addItemToCollection = (event) => {
  const { collectionId, itemId, filename } = event.data;

  console.info(`SW: Received collection item ${filename}.`);

  event.waitUntil(
    setItem(collectionId ? addImageToCollection : addImageToCollectionItem, {
      id: collectionId,
      itemId,
      filename
    })
      .then(() => {
        console.info(
          collectionId
            ? `SW: Added item to collection: "${collectionId}", item id "${itemId}" and filename "${filename}".`
            : `SW: Added collection item with id "${itemId}" and filename "${filename}".`
        );
      })
      .catch((err) => console.error('SW: Adding collection item failed:', err))
  );
};

const retriedFilenames = new Set();

const retryCachedImageUpload = (event) => {
  const { filename, getSignedUrl, imageUploadUrls } = event.data;

  // at most one retry attempt per filename per SW lifetime
  if (retriedFilenames.has(filename)) {
    return;
  }

  retriedFilenames.add(filename);

  console.info(`SW: Retrying upload for image "${filename}"`);

  const originalImageUrl = imageUploadUrls[imageUploadUrls.length - 1];
  const cacheKey = `${originalImageUrl.slice(0, -5)}${filename}${originalImageUrl.slice(-5)}`;

  event.waitUntil(
    caches
      .match(cacheKey)
      .then((cachedResponse) => {
        if (!cachedResponse) {
          throw new Error(`Image is missing from the cache: ${cacheKey}`);
        }

        return cachedResponse.blob();
      })
      .then((fileData) =>
        uploadFile({ filename, fileData, getSignedUrl }).then((response) => {
          if (response.ok) {
            return response;
          }

          console.error('SW: Cached image upload retry failed:', response);

          // retry once
          return uploadFile({ filename, fileData, getSignedUrl });
        })
      )
      .then((response) => {
        if (response.ok) {
          console.info('✅ SW: Cached image upload retry successfully!');
        }
      })
      .catch((err) => {
        // remove filename from retried list in case of network errors so we can try again
        retriedFilenames.delete(filename);

        console.error('SW: Cached image upload retry failed:', err);
      })
  );
};

self.addEventListener('message', (event) => {
  if (!event.data?.action) {
    return undefined;
  }

  switch (event.data.action) {
    case 'cache-image':
      uploadAndCacheImage(event);

      break;
    case 'cache-collection-item':
      addItemToCollection(event);

      break;
    case 'retry-cached-image-upload':
      retryCachedImageUpload(event);

      break;
    default:
      console.error(`Invalid action: ${event.data.action}`);

      break;
  }
});

const checkedImageUrls = new Set();

const checkCollectionImageUpload = async (imageUrl) => {
  console.info(`SW: Checking upload for image: ${imageUrl}`);

  // GET instead of HEAD: the CDN only sends CORS headers for GET requests
  const response = await fetch(imageUrl);

  // the status is all we need, avoid downloading the image body
  await response.body?.cancel();

  return response.ok;
};

const getClient = (clientId) => self.clients.get(clientId);

const sendMissingMessage = async ({ clientId, filename }) => {
  const client = await getClient(clientId);

  return client?.postMessage({ action: 'cached-image-upload-missing', filename });
};

const collectionImageExtension = '.webp';

const getFilename = (imageUrl) =>
  new URL(imageUrl).pathname
    .split('/')
    .pop()
    .slice(0, -1 * collectionImageExtension.length);

const verifyCachedImageUpload = async ({ clientId, imageUrl }) => {
  // check each URL at most once per SW lifetime
  if (checkedImageUrls.has(imageUrl)) {
    return;
  }

  checkedImageUrls.add(imageUrl);

  try {
    const isUploaded = await checkCollectionImageUpload(imageUrl);

    if (isUploaded) {
      return;
    }

    console.info(`SW: Image with url: ${imageUrl} is missing, notifying client`);

    const filename = getFilename(imageUrl);

    await sendMissingMessage({ clientId, filename });
  } catch (err) {
    // a network/CORS failure is not proof the upload is missing,
    // clear the image url so we can check again
    checkedImageUrls.delete(imageUrl);

    console.error('SW: Upload check failed:', err);
  }
};

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'GET' && url.host === 'collection-images.centralbeans.com') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          const imageUrl = event.request.url;
          console.info('SW: Serving image from cache!', imageUrl);

          event.waitUntil(verifyCachedImageUpload({ clientId: event.clientId, imageUrl }));

          return cachedResponse;
        }

        return fetch(event.request);
      })
    );
  }
});
