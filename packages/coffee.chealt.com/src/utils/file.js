const onlyImagePickerOptions = {
  types: [
    {
      description: 'Images',
      accept: {
        'image/*': ['.png', '.gif', '.jpeg', '.jpg']
      }
    }
  ]
};

const openFile = async (options) => {
  const [fileHandle] = await window.showOpenFilePicker(options);

  return fileHandle.getFile();
};

const writeFile = async (fileData) => {
  const fileWorker = new Worker(new URL('./fileWorker.js', import.meta.url));

  return new Promise((resolve, reject) => {
    fileWorker.onmessage = (event) => {
      if (event.data.success) {
        resolve();
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

export { openFile, writeFile, deleteFile, onlyImagePickerOptions };
