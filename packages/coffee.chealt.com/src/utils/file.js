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

const deleteFile = async (name) => {
  const rootDirectory = await navigator.storage.getDirectory();

  return rootDirectory.removeEntry(name);
};

export { writeFile, deleteFile };
