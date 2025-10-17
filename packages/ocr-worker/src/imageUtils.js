import sharp from 'sharp';

const baseSize = 32;
const multipleOfBaseSize = (image) => {
  const width = image.width;
  const height = image.height;

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

const imageFromArrayBuffer = async (buffer) => ({
  data: new Uint8ClampedArray(buffer),
  width: 0, // These would need to be extracted from image headers
  height: 0
});

const resizeImage = async ({ imageBuffer, width, originalWidth, height, originalHeight }) => {
  const sharpImage = await sharp(imageBuffer, { raw: { width: originalWidth, height: originalHeight, channels: 4 } });

  const resizedImage = await sharpImage.resize({ width, height, fit: 'contain' });
  const { data, info } = await resizedImage.raw().toBuffer({ resolveWithObject: true });

  return {
    data: Uint8ClampedArray.from(data),
    width: info.width,
    height: info.height
  };
};

export { imageFromArrayBuffer, multipleOfBaseSize, outputToImage, resizeImage };
