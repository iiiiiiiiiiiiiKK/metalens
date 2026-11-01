/**
 * Captures the README screenshots from a real, running build.
 *
 *   node scripts/capture-screenshots.mjs --url=http://127.0.0.1:4380/
 *
 * Screenshots are taken from the deployed app with real demo data loaded — no
 * mockups, no compositing.
 */
import { chromium, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('--url='))?.slice(6) ?? 'http://127.0.0.1:4380/';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'docs/screenshots');

await mkdir(outDir, { recursive: true });

const save = async (target, name) => {
  await target.screenshot({ path: resolve(outDir, name), animations: 'disabled' });
  console.log(`wrote docs/screenshots/${name}`);
};

/** Loads the "messy real-world page" demo so the UI shows real findings. */
async function inspectSample(page, sampleId = 'messy') {
  // `networkidle` never settles when a preview image is slow or blocked, so wait
  // for the app's own ready signal instead.
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /samples|示例/i }).click();
  await page.getByTestId(`load-sample-${sampleId}`).click();
  await page.getByTestId('health-score').waitFor({ state: 'visible' });
  // Give the image probes a moment to settle so the placeholder state is honest.
  await page.waitForTimeout(2500);
}

// ---------------------------------------------------------------- desktop ---
{
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    locale: 'en-US',
  });
  await inspectSample(page, 'messy');
  await save(page, 'desktop.png');

  await page.locator('#results').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await save(page, 'desktop-findings.png');

  await page.locator('#code').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await save(page, 'desktop-code.png');

  // Hero / empty state
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await save(page, 'desktop-empty.png');

  await browser.close();
}

// ----------------------------------------------------------------- mobile ---
{
  // Chromium with the iPhone descriptor: WebKit cannot reach the public host from
  // this capture environment, and the WebKit layout itself is verified by the
  // Playwright iphone-13 project against the same build.
  const browser = await chromium.launch();
  const page = await browser.newPage({
    ...devices['iPhone 13'],
    colorScheme: 'dark',
    locale: 'en-US',
  });
  await inspectSample(page, 'complete');
  await save(page, 'mobile-preview.png');

  await page.locator('#results').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await save(page, 'mobile-findings.png');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await save(page, 'mobile.png');

  await browser.close();
}

console.log('done');
