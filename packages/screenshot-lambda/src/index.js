import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { chromium } from 'playwright';
import fs from 'fs/promises';

let browser;

export const handler = async (event) => {
  const { url, filename, bucketName } = event;

  if (!browser) {
    browser = await chromium.launch({
      args: ['--disable-dev-shm-usage', '--no-sandbox']
    });
  }

  const page = await browser.newPage();
  try {
    // Navigate with a timeout
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Take full page screenshot
    const screenshot = await page.screenshot({ fullPage: true });

    if (!process.env.IS_LOCAL) {
      const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-central-1' });
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: filename,
          Body: screenshot,
          ContentType: 'image/png'
        })
      );

      // eslint-disable-next-line no-else-return
      return { statusCode: 200, body: 'Screenshot uploaded to S3' };
    } else {
      const outputPath = `/var/task/test-results/${filename}`;
      await fs.writeFile(outputPath, screenshot);
      return { statusCode: 200, body: `Screenshot saved locally at ${outputPath}` };
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during execution:', error);

    throw error;
  } finally {
    await page.close();
  }
};
