import Detection from './models/Detection';
import Recognition from './models/Recognition';

class Ocr {
  static async create(options = {}) {
    const detection = await Detection.create(options);
    const recognition = await Recognition.create(options);

    return new Ocr({ detection, recognition });
  }

  #detection;
  #recognition;

  constructor({
    detection,
    recognition
  }) {
    this.#detection = detection;
    this.#recognition = recognition;
  }

  async detect(image, options = {}) {
    const { lineImages, resizedImageWidth, resizedImageHeight } = await this.#detection.run(image, options);
    const texts = await this.#recognition.run(lineImages, options);

    return {
      texts,
      resizedImageWidth,
      resizedImageHeight
    };
  }
}

export default Ocr;
