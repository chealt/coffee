import { env } from 'onnxruntime-web';

env.wasm.proxy = true;
// env.wasm.numThreads = 4;

export { default } from './Ocr';
