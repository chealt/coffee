import { writeFile } from '../../utils/file';

let mediaStream = null;
const video = document.getElementById('video');
const camera = document.getElementById('camera');
const photo = document.getElementById('photo');
const captureButton = document.getElementById('capture-photo');

document.querySelector('#open-camera').addEventListener('click', () => {
  document.querySelector('#camera').showModal();
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
      video.srcObject = stream;
      video.play();
      mediaStream = stream;
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`An error occurred: ${err}`);
    });
});

video.addEventListener(
  'canplay',
  () => {
    camera.classList.add('recording');
  }
);

captureButton.addEventListener(
  'click',
  (event) => {
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width && height) {
      const context = photo.getContext('2d');

      photo.width = width;
      photo.height = height;
      context.drawImage(video, 0, 0, width, height);

      photo.toBlob(async (blob) => {
        const fileData = new File([blob], `${Date.now()}.png`, blob); // PNG is the default for a canvas' toBlob method

        await writeFile(fileData);

        document.querySelector('#camera').close();
        document.querySelector('coffee-gallery').dispatchEvent(new CustomEvent('coffee-gallery-refresh'));
      });

      camera.classList.remove('recording');
    }

    event.preventDefault();
  }
);

camera.addEventListener('close', () => {
  const videoTrack = mediaStream.getVideoTracks()[0];
  mediaStream.removeTrack(videoTrack);
  video.pause();
});
