const baseSize = 32;
const multipleOfBaseSize = (image) => {
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;

  const newWidth = Math.max(Math.ceil(width / baseSize) * baseSize, baseSize);
  const newHeight = Math.max(Math.ceil(height / baseSize) * baseSize, baseSize);

  return { width: newWidth, height: newHeight };
};

const outputToImage = (output, threshold) => {
  const height = output.dims[2];
  const width = output.dims[3];
  const data = new Uint8Array(width * height * 4);

  for (const [outIndex, outValue] of output.data.entries()) {
    const n = outIndex * 4;
    const value = +outValue > threshold ? 255 : 0;
    data[n] = value; // R
    data[n + 1] = value; // G
    data[n + 2] = value; // B
    data[n + 3] = 255; // A
  }

  return { data: Uint8ClampedArray.from(data), width, height };
};

const imageFromUrl = async (url) => {
  const image = new Image();
  image.src = url;
  await image.decode();

  return image;
};

const appendImage = (image) => {
  const imageData = new ImageData(Uint8ClampedArray.from(image.data), image.width, image.height);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  const newImage = new Image();
  newImage.src = canvas.toDataURL();

  document.body.appendChild(newImage);
};

export { imageFromUrl, multipleOfBaseSize, outputToImage, appendImage };
