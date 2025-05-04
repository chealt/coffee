const writeFile = async (file) => {
  const rootDirectory = await navigator.storage.getDirectory();
  const fileHandle = await rootDirectory.getFileHandle(file.name, { create: true });
  const accessHandle = await fileHandle.createSyncAccessHandle();
  const reader = new FileReader();

  reader.readAsArrayBuffer(file);

  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        await accessHandle.write(reader.result);
        await accessHandle.close();
      } catch (error) {
        reject(error);
      }

      resolve();
    };

    reader.onerror = (error) => {
      reject(error);
    };
  });
};

onmessage = async ({ data: { data, command } }) => {
  switch (command) {
  case 'writeFile':
    try {
      await writeFile(data);

      postMessage({ success: true });
    } catch (error) {
      postMessage({ error });
    }

    return undefined;
  default:
    // eslint-disable-next-line no-console
    console.error(`missing command specified: '${command}'`);

    return undefined;
  }
};
