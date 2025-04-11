const video = document.getElementById('video');
const camera = document.getElementById('camera');
const photo = document.getElementById('photo');
const captureButton = document.getElementById('capture-photo');
const pictures = document.getElementById('pictures');

document.querySelector('#open-camera').addEventListener('click', () => {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
      video.play();
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

    const width = camera.clientWidth;
    const height = (video.videoHeight / video.videoWidth) * width;

    video.setAttribute('width', width);
    video.setAttribute('height', height);
    photo.setAttribute('width', width);
    photo.setAttribute('height', height);
  }
);

captureButton.addEventListener(
  'click',
  (event) => {
    const width = camera.clientWidth;
    const height = (video.videoHeight / video.videoWidth) * width;

    if (width && height) {
      const context = photo.getContext('2d');

      photo.width = width;
      photo.height = height;
      context.drawImage(video, 0, 0, width, height);

      const data = photo.toDataURL('image/png');
      const image = new Image(width, height);
      image.src = data;

      const picture = document.createElement('li');

      camera.classList.remove('recording');

      picture.appendChild(image);
      pictures.appendChild(picture);
    }

    event.preventDefault();
  }
);
