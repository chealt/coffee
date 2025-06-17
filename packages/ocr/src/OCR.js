/* eslint-disable no-console */
import { env, InferenceSession, Tensor } from 'onnxruntime-web';

import dictionary from './dictionary';
import { appendImage, imageFromUrl, multipleOfBaseSize, outputToImage } from './imageUtils';
import { imageToModelInput } from './modelUtils';
import { splitIntoLineImages } from './splitIntoLineImages';

env.wasm.proxy = true;

const defaultOptions = {
  debug: false,
  modelPaths: {
    detectionPath: '/ch_PP-OCRv4_det_infer.onnx',
    recognitionPath: '/ch_PP-OCRv4_rec_infer.onnx',
    dictionaryPath: '/ppocr_keys_v1.txt'
  },
  onnxOptions: {
    executionProviders: ['wasm']
  }
};

const OCR = async ({ debug, modelPaths: { detectionPath, recognitionPath }, onnxOptions } = defaultOptions) => {
  const detectionModel = await InferenceSession.create(detectionPath, onnxOptions);
  const recognitionModel = await InferenceSession.create(recognitionPath, onnxOptions);

  const resizeImage = ({ image, width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width || Math.round((image.width / image.height) * height);
    canvas.height = height || Math.round((image.height / image.width) * width);

    if (image.data) {
      const oldCanvas = document.createElement('canvas');

      oldCanvas.width = image.width;
      oldCanvas.height = image.height;
      oldCanvas
        .getContext('2d')
        .putImageData(new ImageData(Uint8ClampedArray.from(image.data), image.width, image.height), 0, 0);
      canvas.getContext('2d').drawImage(oldCanvas, 0, 0, canvas.width, canvas.height);
    } else {
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    }

    const newImage = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);

    return {
      data: Uint8ClampedArray.from(newImage.data),
      width: canvas.width,
      height: canvas.height
    };
  };

  const prepareImage = async (imageSrc) => {
    const image = await imageFromUrl(imageSrc);
    const { width, height } = multipleOfBaseSize(image);

    return resizeImage({ image, width, height });
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

  const detect = async (imageSrc) => {
    const image = await prepareImage(imageSrc);
    const modelOutput = await runModel({ model: detectionModel, image });
    const outputImage = outputToImage(modelOutput, 0.03);
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

    for (const { image } of lineImages) {
      if (debug) {
        appendImage(image);
      }

      // Resize Image to 48px height
      //  - height must <= 48
      //  - height: 48 is more accurate then 40, but same as 30
      const resizedImage = resizeImage({
        image,
        height: 48
      });

      if (debug) {
        appendImage(resizedImage);
      }

      const output = await runModel({ model: recognitionModel, image: resizedImage });
      const lines = await decodeText(output);
      allLines.unshift(...lines);
    }

    const result = calculateBox({ lines: allLines, lineImages });

    return result;
  };

  const extractText = async (imageSrc) => {
    performance.mark('ocr-started');

    const { lineImages } = await detect(imageSrc);
    const texts = await recognize(lineImages);

    performance.mark('ocr-finished');
    const ocrPerformance = performance.measure('ocr-duration', {
      detail: { imageSrc },
      start: 'ocr-started',
      end: 'ocr-finished'
    });

    if (debug) {
      console.debug(`OCR took ${ocrPerformance.duration / 1000} seconds for ${imageSrc}`);
    }

    return texts.map(({ text }) => text);
  };

  return {
    extractText
  };
};

export default OCR;
