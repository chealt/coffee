import { setImageUploaded } from '../components/common/storage.js';

const writeFile = async (fileData) => {
  const fileWorker = new Worker(new URL('./fileWorker.js', import.meta.url));

  return new Promise((resolve, reject) => {
    fileWorker.onmessage = (event) => {
      if (event.data.success) {
        resolve(event.data.filename);
      } else {
        reject(event.data.error);
      }
    };

    fileWorker.postMessage({
      command: 'writeFile',
      data: fileData
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

  if (uploadResponse.ok) {
    setImageUploaded(filename);
  }

  return uploadResponse;
};

export { deleteFile, deleteFileRemote, uploadFile, writeFile };
