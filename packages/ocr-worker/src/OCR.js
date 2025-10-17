/* eslint-disable no-console */
import { InferenceSession, Tensor } from 'onnxruntime-web';
import sharp from 'sharp';

import dictionary from './dictionary.js';
import { outputToImage, multipleOfBaseSize, resizeImage } from './imageUtils.js';
import { imageToModelInput } from './modelUtils.js';
import { splitIntoLineImages } from './splitIntoLineImages.js';
import { clean } from './utils/text.js';

const defaultOptions = {
  debug: false,
  modelPaths: {
    detectionPath: 'models/ch_PP-OCRv4_det_infer.onnx',
    recognitionPath: 'models/ch_PP-OCRv4_rec_infer.onnx'
  },
  onnxOptions: {
    executionProviders: ['wasm']
  }
};

const OCR = async ({ debug, modelPaths: { detectionPath, recognitionPath }, onnxOptions } = defaultOptions) => {
  const detectionModel = await InferenceSession.create(detectionPath, onnxOptions);
  const recognitionModel = await InferenceSession.create(recognitionPath, onnxOptions);

  const prepareImage = async ({ imageBuffer }) => {
    const sharpImage = await sharp(imageBuffer).ensureAlpha(1);

    if (debug) {
      console.info(`Writing original image to disk...`);

      await sharpImage.toFile('dist/original-image.jpg');
    }

    const rawImage = await sharpImage.raw().toBuffer({ resolveWithObject: true });

    const newSize = multipleOfBaseSize({ width: rawImage.info.width, height: rawImage.info.height });

    if (debug) {
      console.debug(`New image dimensions: ${newSize.width}x${newSize.height}`);
    }

    const resizedImage = await sharpImage.resize({ width: newSize.width, height: newSize.height, fit: 'contain' });

    if (debug) {
      console.info(`Writing resized image to disk...`);

      await resizedImage.jpeg().toFile('dist/resized-image.jpg');
    }

    const resizedRawImage = await resizedImage.raw().toBuffer({ resolveWithObject: true });

    return {
      data: Uint8ClampedArray.from(resizedRawImage.data),
      width: resizedRawImage.info.width,
      height: resizedRawImage.info.height
    };
  };

  const runModel = async ({ model, image }) => {
    const { data, width, height } = imageToModelInput(image, {});
    const input = Float32Array.from(data);
    const tensor = new Tensor('float32', input, [1, 3, height, width]);
    const outputs = await model.run(
      {
        [model.inputNames[0]]: tensor
      },
      onnxOptions
    );
    const output = outputs[model.outputNames[0]];

    return output;
  };

  const detect = async ({ imageBuffer }) => {
    console.info(`Preparing image...`);
    const image = await prepareImage({ imageBuffer });

    console.info(`Running detection model...`);

    performance.mark('model:detection:start');
    const modelOutput = await runModel({ model: detectionModel, image });
    performance.mark('model:detection:end');

    const { duration: detectionModelDuration } = performance.measure(
      'model:detection',
      'model:detection:start',
      'model:detection:end'
    );
    console.info(`Detection model took: ${detectionModelDuration}ms`);

    console.info(`Converting output to image...`);
    const outputImage = outputToImage(modelOutput, 0.03);

    if (debug) {
      console.info(`Saving output image...`);
      await sharp(outputImage.data, { raw: { width: outputImage.width, height: outputImage.height, channels: 4 } })
        .jpeg()
        .toFile('dist/output-image.jpg');
    }

    console.info(`Splitting into line images...`);
    const lineImages = await splitIntoLineImages(outputImage, image);

    if (debug) {
      console.debug(lineImages);
    }

    return {
      lineImages,
      resizedImageWidth: image.width,
      resizedImageHeight: image.height
    };
  };

  const calculateAverageHeight = (boxes) => {
    let totalHeight = 0;

    for (const box of boxes) {
      const [[, y1], , [, y2]] = box;
      const height = y2 - y1;
      totalHeight += height;
    }

    return totalHeight / boxes.length;
  };

  const groupBoxesByMidlineDifference = (boxes) => {
    const averageHeight = calculateAverageHeight(boxes);
    const result = [];

    for (const box of boxes) {
      const [[, y1], , [, y2]] = box;
      const midline = (y1 + y2) / 2;
      const group = result.find((b) => {
        const [[, groupY1], , [, groupY2]] = b[0];
        const groupMidline = (groupY1 + groupY2) / 2;

        return Math.abs(groupMidline - midline) < averageHeight / 2;
      });

      if (group) {
        group.push(box);
      } else {
        result.push([box]);
      }
    }

    for (const group of result) {
      group.sort((a, b) => {
        const [ltA] = a;
        const [ltB] = b;

        return ltA[0] - ltB[0];
      });
    }

    result.sort((a, b) => a[0][0][1] - b[0][0][1]);

    return result;
  };

  const afAfRec = (lines) => {
    const outputLines = [];
    const indexes = new Map();

    for (const index in lines) {
      if (Object.hasOwn(lines, index)) {
        const box = lines[index].box;
        indexes.set(box, Number(index));
      }
    }

    const groupedBoxes = groupBoxesByMidlineDifference([...indexes.keys()]);

    for (const boxes of groupedBoxes) {
      const texts = [];
      let mean = 0;

      for (const box of boxes) {
        const index = indexes.get(box);

        if (index === undefined) {
          continue;
        }

        const line = lines[index];
        texts.push(line.text);
        mean += line.mean;
      }

      let outputBox;

      if (boxes.at(0) && boxes.at(-1)) {
        outputBox = [boxes.at(0)[0], boxes.at(-1)[1], boxes.at(-1)[2], boxes.at(0)[3]];
      }

      outputLines.push({
        mean: mean / boxes.length,
        text: texts.join(' '),
        box: outputBox
      });
    }

    return outputLines;
  };

  const calculateBox = ({ lines, lineImages }) => {
    let mainLine = lines;
    const box = lineImages;

    for (const i in mainLine) {
      if (Object.hasOwn(mainLine, i)) {
        const b = box[mainLine.length - Number(i) - 1].box;

        for (const p of b) {
          p[0] = p[0]; // eslint-disable-line no-self-assign
          p[1] = p[1]; // eslint-disable-line no-self-assign
        }

        mainLine[i].box = b;
      }
    }

    mainLine = mainLine.filter((x) => x.mean >= 0.5);
    mainLine = afAfRec(mainLine);

    return mainLine;
  };

  const decode = ({ index, probability, shouldRemoveDuplicate }) => {
    const ignoredTokens = [0];
    const charList = [];
    const confList = [];

    for (let i = 0; i < index.length; i++) {
      if (index[i] in ignoredTokens) {
        continue;
      }

      if (shouldRemoveDuplicate) {
        if (i > 0 && index[i - 1] === index[i]) {
          continue;
        }
      }

      charList.push(dictionary[index[i] - 1]);

      if (probability) {
        confList.push(probability[i]);
      } else {
        confList.push(1);
      }
    }

    let text = '';
    let mean = 0;

    if (charList.length) {
      text = charList.join('');
      let sum = 0;
      confList.forEach((item) => {
        sum += item;
      });
      mean = sum / confList.length;
    }

    return { text, mean };
  };

  const decodeText = (output) => {
    const data = output;
    const predLen = data.dims[2];
    const line = [];
    let ml = data.dims[0] - 1;

    for (let l = 0; l < data.data.length; l += predLen * data.dims[1]) {
      const predsIdx = [];
      const predsProb = [];

      for (let i = l; i < l + predLen * data.dims[1]; i += predLen) {
        const tmpArr = data.data.slice(i, i + predLen);
        const tmpMax = tmpArr.reduce((a, b) => Math.max(a, b), Number.NEGATIVE_INFINITY);
        const tmpIdx = tmpArr.indexOf(tmpMax);
        predsProb.push(tmpMax);
        predsIdx.push(tmpIdx);
      }

      line[ml] = decode({ index: predsIdx, probability: predsProb, shouldRemoveDuplicate: true });
      ml--;
    }

    return line;
  };

  const recognize = async (lineImages) => {
    const allLines = [];

    if (debug) {
      let i = 0;

      for (const { image } of lineImages) {
        await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 4 } })
          .jpeg()
          .toFile(`dist/line-image-${i++}.jpg`);
      }
    }

    for (const { image } of lineImages) {
      if (debug) {
        console.debug('Processing line image:', image.width, 'x', image.height);
      }

      // Resize Image to 48px height
      const resizedImage = await resizeImage({
        imageBuffer: image.data,
        originalWidth: image.width,
        originalHeight: image.height,
        height: 48
      });

      if (debug) {
        console.debug('Resized image:', resizedImage.width, 'x', resizedImage.height);
      }

      const output = await runModel({ model: recognitionModel, image: resizedImage });
      const lines = await decodeText(output);

      allLines.unshift(...lines);
    }

    const result = calculateBox({ lines: allLines, lineImages });

    return result;
  };

  const extractText = async (imageBuffer) => {
    try {
      performance.mark('detection:start');
      const { lineImages } = await detect({ imageBuffer });
      performance.mark('detection:end');

      const { duration: detectionDuration } = performance.measure('detection', 'detection:start', 'detection:end');
      console.info(`Detection took ${detectionDuration}ms`);

      if (debug) {
        console.debug('Detected line images: ', lineImages.length);
      }

      performance.mark('recognition:start');
      const texts = await recognize(lineImages);
      performance.mark('recognition:end');

      const { duration: recognitionDuration } = performance.measure(
        'recognition',
        'recognition:start',
        'recognition:end'
      );
      console.info(`Recognition took ${recognitionDuration}ms`);

      const { duration: OCRduration } = performance.measure('OCR', 'detection:start', 'recognition:end');
      console.debug(`OCR took ${OCRduration}ms`);

      return texts.map(({ text }) => clean(text));
    } catch (error) {
      console.error('Error during OCR:', error);

      throw error;
    }
  };

  return {
    extractText
  };
};

export default OCR;
