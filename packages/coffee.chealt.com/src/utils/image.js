const getFiledata = ({ imageElement, filename }) =>
  fetch(imageElement.src)
    .then((response) => response.blob())
    .then((blob) => new File([blob], filename, { type: blob.type }));

export { getFiledata };
