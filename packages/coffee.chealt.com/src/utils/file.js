const showOpenFilePickerPolyfill = (options) => new Promise((resolve) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = options.multiple;
  input.accept = options.types
    .map((type) => type.accept)
    .flatMap((inst) => Object.keys(inst).flatMap((key) => inst[key]))
    .join(',');

  input.addEventListener('change', () => {
    resolve(
      [...input.files].map((file) => ({
        getFile: async () =>
          new Promise((resolveFile) => {
            resolveFile(file);
          })
      }))
    );
  });

  input.click();
});

if (typeof window.showOpenFilePicker !== 'function') {
  window.showOpenFilePicker = showOpenFilePickerPolyfill;
}

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
