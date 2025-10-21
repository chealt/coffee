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

  try {
    const result = await main({ filename });
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

export { handler };
