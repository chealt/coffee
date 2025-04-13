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
  const rootDirectory = await navigator.storage.getDirectory();
  const fileHandle = await rootDirectory.getFileHandle(fileData.name, { create: true });
  const writable = await fileHandle.createWritable();

  writable.write(fileData);
  writable.close();
};

export { openFile, writeFile, onlyImagePickerOptions };
