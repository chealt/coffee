import { writeFile } from '../../utils/file';

class CoffeeScanner extends HTMLElement {
  connectedCallback() {
    this.mediaStream = null;
    this.video = this.querySelector('#video');
    this.camera = this.querySelector('#camera');
    this.photo = this.querySelector('#photo');
    this.captureButton = this.querySelector('#capture-photo');
    this.cameraTrigger = this.querySelector('#open-camera');

    this.addCameraTriggerClickEvent();
    this.addRecordingEvent();
    this.addCaptureButtonEvent();
    this.addCameraCloseEvent();
  }

  addCameraTriggerClickEvent() {
    this.cameraTrigger.addEventListener('click', () => {
      this.camera.showModal();
      navigator.mediaDevices
        .getUserMedia({
          video: {
          // ideally 4K
            width: { ideal: 4096 },
            height: { ideal: 2160 },
            facingMode: { ideal: 'environment' }
          },
          audio: false
        })
        .then((stream) => {
          this.video.srcObject = stream;
          this.video.play();
          this.mediaStream = stream;
        })
        .catch((err) => {
        // eslint-disable-next-line no-console
          console.error(`An error occurred: ${err}`);
        });
    });
  }

  addRecordingEvent() {
    this.video.addEventListener(
      'canplay',
      () => {
        this.camera.classList.add('recording');
      }
    );
  }

  addCaptureButtonEvent() {
    this.captureButton.addEventListener(
      'click',
      (event) => {
        const width = this.video.videoWidth;
        const height = this.video.videoHeight;

        if (width && height) {
          const context = this.photo.getContext('2d');

          this.photo.width = width;
          this.photo.height = height;
          context.drawImage(this.video, 0, 0, width, height);

          this.photo.toBlob(async (blob) => {
            const fileData = new File([blob], `${Date.now()}.png`, blob); // PNG is the default for a canvas' toBlob method

            await writeFile(fileData);

            document.querySelector('#camera').close();
            document.querySelector('coffee-gallery').dispatchEvent(new CustomEvent('coffee-gallery-refresh'));
          });

          this.camera.classList.remove('recording');
        }

        event.preventDefault();
      }
    );
  }

  addCameraCloseEvent() {
    this.camera.addEventListener('close', () => {
      const videoTrack = this.mediaStream.getVideoTracks()[0];
      this.mediaStream.removeTrack(videoTrack);
      this.video.pause();
    });
  }
}

customElements.define('coffee-scanner', CoffeeScanner);
