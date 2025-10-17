const imageToModelInput = (image, { mean = [0, 0, 0], std = [1, 1, 1] }) => {
  const R = [];
  const G = [];
  const B = [];

  for (let i = 0; i < image.data.length; i += 4) {
    R.push((image.data[i] / 255 - mean[0]) / std[0]);
    G.push((image.data[i + 1] / 255 - mean[1]) / std[1]);
    B.push((image.data[i + 2] / 255 - mean[2]) / std[2]);
  }

  const newData = [...B, ...G, ...R];

  return {
    data: newData,
    width: image.width,
    height: image.height
  };
};

export { imageToModelInput };
