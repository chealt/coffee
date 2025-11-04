import { handler } from './dist/src/index.js';

await handler({
  Records: [
    {
      s3: {
        object: {
          key: 'https://sheepandraven.com/en/our-shop'
        }
      }
    }
  ]
});
