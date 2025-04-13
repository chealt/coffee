import { onlyImagePickerOptions, openFile, writeFile } from '../../utils/file';

document.getElementById('open-upload').addEventListener('click', async () => {
  const fileData = await openFile({
    ...onlyImagePickerOptions,
    excludeAcceptAllOption: true,
    multiple: false
  });

  await writeFile(fileData);

  document.querySelector('coffee-gallery').dispatchEvent(new CustomEvent('coffee-gallery-refresh'));
});
