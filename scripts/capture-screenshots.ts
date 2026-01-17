import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

async function captureScreenshots() {
  // Create screenshots directory
  const screenshotsDir = join(process.cwd(), 'screenshots');
  mkdirSync(screenshotsDir, { recursive: true });

  // Try to use existing browser or fall back to bundled
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome'
  }).catch(() => chromium.launch());
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log('Capturing screenshots...');

    // Home page
    console.log('1. Capturing home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: join(screenshotsDir, '01-home-page.png'),
      fullPage: true
    });

    // Check if there are models on the page
    const modelLinks = await page.locator('.card.model-card').count();

    if (modelLinks > 0) {
      // Click on first model
      console.log('2. Capturing model page...');
      await page.locator('.card.model-card').first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: join(screenshotsDir, '02-model-page.png'),
        fullPage: true
      });

      // Check if there's an explore we can preview
      const exploreCount = await page.locator('.explore-header').count();

      if (exploreCount > 0) {
        // Click first preview button
        console.log('3. Capturing explore section (expanded)...');
        await page.locator('.explore-header').first().click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: join(screenshotsDir, '03-model-explore-expanded.png'),
          fullPage: true
        });

        // Try to go to explorer page
        const previewButton = page.locator('.action-button.explore-button').first();
        if (await previewButton.count() > 0) {
          console.log('4. Capturing explorer page...');
          await previewButton.click();
          await page.waitForTimeout(2000);
          await page.screenshot({
            path: join(screenshotsDir, '04-explorer-page.png'),
            fullPage: true
          });
        }
      }

      // Go back to home
      await page.goto('http://localhost:3000');
      await page.waitForTimeout(1000);
    }

    // Check if there are notebooks
    const notebookLinks = await page.locator('.card.notebook-card').count();

    if (notebookLinks > 0) {
      console.log('5. Capturing notebook page...');
      await page.locator('.card.notebook-card').first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: join(screenshotsDir, '05-notebook-page.png'),
        fullPage: true
      });
    }

    console.log('\nScreenshots saved to:', screenshotsDir);
    console.log('✓ All screenshots captured successfully!');

  } catch (error) {
    console.error('Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
