const convertToHex = (arrayBuffer) =>
  Array.from(new Uint8Array(arrayBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const getContentHash = async ({ arrayBuffer, algorithm = 'SHA-256' }) => {
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);

  return convertToHex(hashBuffer);
};

const writeFile = async (fileData) => {
  const fileWorker = new Worker(new URL('./fileWorker.js', import.meta.url));
  const filename = await getContentHash({ arrayBuffer: await fileData.arrayBuffer() });

  return new Promise((resolve, reject) => {
    fileWorker.onmessage = (event) => {
      if (event.data.success) {
        resolve(filename);
      } else {
        reject(event.data.error);
      }
    };

    fileWorker.postMessage({
      command: 'writeFile',
      data: {
        fileData,
        filename
      }
    });
  });
};

const deleteFile = async (filename) => {
  const rootDirectory = await navigator.storage.getDirectory();

  return rootDirectory.removeEntry(filename);
};

const deleteFileRemote = async ({ filename, getSignedUrl }) => {
  const response = await fetch(getSignedUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({ filename, method: 'DELETE' })
  });

  const { url } = await response.json();

  const deleteResponse = await fetch(url, {
    method: 'DELETE'
  });

  return deleteResponse.ok;
};

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

export { getContentHash, deleteFile, deleteFileRemote, uploadFile, writeFile };
