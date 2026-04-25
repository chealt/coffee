import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import './Sentry/sentry-init.js'; // Import Sentry init
import logger from './Sentry/logger.js'; // Import custom logger

let s3Client;
let browser;

export const handler = async (event) => {
  const { url, filename, bucketName } = event;

  try {
    if (!browser) {
      logger.info('Launching browser...');
      browser = await chromium.launch({
        args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-gpu']
      });
    }

    // Try to use the first context, otherwise create a new one
    const context = browser.contexts().length > 0 ? browser.contexts()[0] : await browser.newContext();
    const page = await context.newPage();

    logger.info(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const screenshot = await page.screenshot({ fullPage: true });

    if (!process.env.IS_LOCAL) {
      if (!s3Client) {
        s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-central-1' });
      }
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: filename,
          Body: screenshot,
          ContentType: 'image/png'
        })
      );
      await page.close();
      return { statusCode: 200, body: 'Screenshot uploaded to S3' };
    } else {
      const outputPath = `/var/task/test-results/${filename}`;
      await fs.writeFile(outputPath, screenshot);
      await page.close();
      return { statusCode: 200, body: `Screenshot saved locally at ${outputPath}` };
    }
  } catch (error) {
    logger.error(`Error during execution: ${error.message}`);
    // If the browser crashed, clear the reference so it re-launches next time
    if (browser) {
      await browser.close().catch(() => {});
      browser = null;
    }
    throw error;
  }
};
