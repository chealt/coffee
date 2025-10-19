import { main } from './main.js';

const handler = async (event) => {
  const { filename } = event;

  if (!filename) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'filename is required'
      })
    };
  }

  return main({ filename });
};

export { handler };
