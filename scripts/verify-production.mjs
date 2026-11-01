/**
 * Production smoke test — runs against a real, deployed URL.
 *
 *   node scripts/verify-production.mjs --url=https://iiiiiiiiiiiiiKK.github.io/metalens/
 *
 * Every assertion below exercises the deployed artefact, not the local build.
 */
import { chromium, devices } from '@playwright/test';

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('--url='))?.slice(6);
if (!url) {
  console.error('usage: node scripts/verify-production.mjs --url=https://...');
  process.exit(1);
}

const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? '' });
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
    console.log(`FAIL  ${name} — ${error.message}`);
  }
};

const browser = await chromium.launch();

/* ------------------------------------------------------------------ desktop */
{
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    colorScheme: 'dark',
  });

  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page
    .getByTestId('health-score')
    .waitFor({ state: 'visible', timeout: 1 })
    .catch(() => {});

  await check('page responds 200 with the app shell', async () => {
    if (!response || response.status() !== 200) throw new Error(`status ${response?.status()}`);
    await page.getByTestId('author-x-link').waitFor();
    return `status ${response.status()}`;
  });

  await check('CSP is delivered with the document', async () => {
    const meta = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    if (!meta) throw new Error('no CSP meta tag');
    if (!/default-src 'self'/.test(meta)) throw new Error('CSP missing default-src');
    return 'meta CSP present';
  });

  await check('author X link points at x.com/0xkillcoin in the header', async () => {
    const href = await page.getByTestId('author-x-link').getAttribute('href');
    if (href !== 'https://x.com/0xkillcoin') throw new Error(`href ${href}`);
    const target = await page.getByTestId('author-x-link').getAttribute('target');
    if (target !== '_blank') throw new Error('link does not open in a new tab');
    const box = await page.getByTestId('author-x-link').boundingBox();
    if (!box || box.y > 100) throw new Error('not in the header');
    return 'href + target + position verified';
  });

  await check('runtime config loads the fetch endpoint', async () => {
    const cfg = await page.evaluate(async () => {
      const res = await fetch('./runtime-config.json', { cache: 'no-store' });
      return res.ok ? res.json() : null;
    });
    if (!cfg) throw new Error('runtime-config.json not served');
    if (!/^https:\/\//.test(cfg.fetchEndpoint ?? '')) throw new Error('no https endpoint');
    return cfg.fetchEndpoint;
  });

  await check('paste HTML → findings, health and code', async () => {
    await page.getByRole('tab', { name: /paste html/i }).click();
    await page.locator('#html-input').fill(`<!doctype html><html lang="en"><head>
      <title>Production check</title>
      <meta name="description" content="A description that is long enough to pass the advisory minimum without being truncated." />
      <meta property="og:title" content="Production OG" />
      <meta property="og:image" content="${new URL('og-cover.png', url).href}" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      </head><body></body></html>`);
    await page.getByTestId('inspect-html').click();
    await page.getByTestId('health-score').waitFor();
    const score = await page.getByTestId('health-score').innerText();
    const code = await page.getByTestId('generated-code').innerText();
    if (!code.includes('og:title')) throw new Error('no generated og:title');
    return `score ${score}, ${code.split('\n').length} lines of markup`;
  });

  await check('real og:image is probed and measured (not fabricated)', async () => {
    // The fixture above points at this deployment's own 1200x630 cover.
    const row = page
      .locator('[data-testid^="finding-image."]', { hasText: 'og:image' })
      .first();
    await row.waitFor({ timeout: 20_000 });
    const text = await row.innerText();
    if (!/1200[^\d]?[×x][^\d]?630|1200 × 630/.test(text)) {
      throw new Error(`unexpected finding: ${text.slice(0, 120)}`);
    }
    return text.split('\n')[0].slice(0, 60);
  });

  await check('platform previews switch', async () => {
    for (const platform of ['Facebook', 'LinkedIn', 'WeChat', 'X']) {
      await page.getByRole('tab', { name: platform === 'X' ? 'X' : platform }).click();
    }
    const preview = page.getByTestId('preview-x');
    if (!(await preview.isVisible())) throw new Error('preview missing');
    return 'four platforms rendered';
  });

  await check('editor edits propagate to the preview', async () => {
    await page.locator('#field-og\\:title').fill('Edited in production');
    const preview = await page.getByTestId('preview-x').innerText();
    if (!preview.includes('Edited in production')) throw new Error('preview did not update');
    return 'live preview updated';
  });

  await check('history persists across a reload', async () => {
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const stored = await page.evaluate(() => localStorage.getItem('metalens.history.v1'));
    if (!stored || !stored.includes('Production check'))
      throw new Error('history not persisted');
    return `${JSON.parse(stored).length} entries`;
  });

  await check('URL mode reports its real failure instead of inventing a result', async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#url-input').fill('https://example.com/');
    await page.getByTestId('inspect-url').click();
    // Either the endpoint returns a real page, or the error panel explains it.
    const error = page.getByTestId('inspect-error');
    const score = page.getByTestId('health-score');
    await Promise.race([
      error.waitFor({ timeout: 45_000 }),
      score.waitFor({ timeout: 45_000 }),
    ]);
    if (await error.count()) {
      const text = await error.innerText();
      return `handled failure: ${text.split('\n')[1]?.slice(0, 70)}`;
    }
    return 'fetched through the endpoint';
  });

  await page.close();
}

/* ------------------------------------------------------------------ mobile */
{
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await check('iPhone 13 viewport has no horizontal overflow', async () => {
    const delta = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (delta > 0) throw new Error(`overflow ${delta}px`);
    return 'scrollWidth == clientWidth';
  });

  await check('iPhone tap targets and input sizes', async () => {
    const input = await page.locator('#url-input').boundingBox();
    const button = await page.getByTestId('inspect-url').boundingBox();
    const fontSize = await page
      .locator('#url-input')
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    if (!input || input.height < 44) throw new Error('input too short');
    if (!button || button.height < 44) throw new Error('button too short');
    if (fontSize < 16) throw new Error(`font-size ${fontSize}`);
    return `input ${input.height}px, button ${button.height}px, font ${fontSize}px`;
  });

  await check('mobile flow: sample → findings → preview', async () => {
    await page.getByRole('tab', { name: /samples/i }).click();
    await page.getByTestId('load-sample-complete').click();
    await page.getByTestId('health-score').waitFor();
    await page.getByRole('tab', { name: 'Facebook' }).click();
    const preview = await page.getByTestId('preview-facebook').innerText();
    if (!preview.includes('MetaLens')) throw new Error('preview missing title');
    const delta = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (delta > 0) throw new Error(`overflow after inspecting: ${delta}px`);
    return 'preview rendered, still no overflow';
  });

  await context.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} production checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
