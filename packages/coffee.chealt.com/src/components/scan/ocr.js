import Ocr from '@chealt/coffee-ocr';

const ocr = await Ocr.create({
  models: {
    detectionPath: '/ch_PP-OCRv4_det_infer.onnx',
    recognitionPath: '/ch_PP-OCRv4_rec_infer.onnx',
    dictionaryPath: '/ppocr_keys_v1.txt'
  },
  onnxOptions: { executionProviders: ['webgpu'] }
});

const extractText = async (image) => {
  performance.mark('ocr-started');

  const imageName = image.closest('li').getAttribute('data-name');
  image.classList.add('processing');

  let text;

  if (image.complete) {
    text = await ocr.detect(image.src);
  } else {
    text = await new Promise((resolve) => {
      image.addEventListener('load', async () => {
        resolve(await ocr.detect(image.src));
      });
    });
  }

  performance.mark('ocr-finished');
  const ocrPerformance = performance.measure('ocr-duration', {
    detail: { imageName },
    start: 'ocr-started',
    end: 'ocr-finished'
  });
  console.log(`OCR took ${ocrPerformance.duration / 1000} seconds for ${imageName}`);

  console.log(text);

  image.classList.remove('processing');
};

export { extractText };
