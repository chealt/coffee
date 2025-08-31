/* eslint-disable no-console */
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

const addSecret = async ({ scriptName, name, text }) => {
  console.info(`Adding secret "${name}" to worker "${scriptName}"...`);

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        text,
        type: 'secret_text'
      })
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    console.info('✅ Success! Secret added.', response.data);
  } catch (error) {
    throw new Error(error);
  }
};

export { addSecret };
