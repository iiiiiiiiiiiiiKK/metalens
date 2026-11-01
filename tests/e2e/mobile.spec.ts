import { expect, test } from '@playwright/test';

/**
 * Mobile-first acceptance: the layout must never scroll sideways, taps must be
 * comfortable, and the author link must stay reachable at the top of the page.
 */

const HTML = `<!doctype html><html lang="en"><head><title>A very long page title that should wrap neatly on a narrow screen instead of pushing the layout wider</title>
<meta name="description" content="A description long enough to exercise line clamping inside the share card previews on small screens." />
<meta property="og:title" content="Mobile layout sample" />
<meta property="og:description" content="Short og description." />
<meta property="og:image" content="https://example.com/cover.png" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="https://example.com/mobile" />
</head><body></body></html>`;

async function inspect(page: import('@playwright/test').Page) {
  await page.getByRole('tab', { name: /paste html/i }).click();
  await page.locator('#html-input').fill(HTML);
  await page.getByTestId('inspect-html').click();
  await expect(page.getByTestId('health-score')).toBeVisible();
}

const overflow = (page: import('@playwright/test').Page) =>
  page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));

test.beforeEach(async ({ page }) => {
  await page.route(
    /^https:\/\/(?!127\.0\.0\.1|localhost).*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i,
    (route) => route.abort(),
  );
  await page.goto('/');
});

test('the author X link sits in the header and points at the right profile', async ({
  page,
}) => {
  const link = page.getByTestId('author-x-link');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'https://x.com/0xkillcoin');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);

  // It must be inside the sticky header, i.e. visible without scrolling.
  const header = page.locator('header');
  await expect(header.getByTestId('author-x-link')).toBeVisible();

  const box = await link.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(Math.min(viewport!.height, 120));
});

test('handles a 320px-wide viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.reload();
  expect(await overflow(page)).toEqual({ doc: 0, body: 0 });

  await inspect(page);
  expect(await overflow(page)).toEqual({ doc: 0, body: 0 });
});

test('no horizontal overflow after inspecting on the device viewport', async ({ page }) => {
  await inspect(page);
  expect(await overflow(page)).toEqual({ doc: 0, body: 0 });

  // Switching platform and card variant must not widen the page either.
  for (const platform of ['Facebook', 'LinkedIn', 'WeChat']) {
    await page.getByRole('tab', { name: platform }).click();
    expect(await overflow(page), platform).toEqual({ doc: 0, body: 0 });
  }
});

test('touch targets stay at least 44px tall', async ({ page }) => {
  const input = page.locator('#url-input');
  const box = await input.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  const button = page.getByTestId('inspect-url');
  const buttonBox = await button.boundingBox();
  expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
});

test('inputs do not trigger iOS zoom (font-size >= 16px)', async ({ page }) => {
  const viewport = page.viewportSize();
  // 16px is only required on phones: mobile Safari zooms a focused input below
  // that size. Desktop intentionally uses a denser 14px.
  test.skip(!viewport || viewport.width >= 640, 'only applies to phone-sized viewports');

  const fontSize = (selector: string) =>
    page.locator(selector).evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));

  expect(await fontSize('#url-input')).toBeGreaterThanOrEqual(16);
  await page.getByRole('tab', { name: /paste html/i }).click();
  expect(await fontSize('#html-input')).toBeGreaterThanOrEqual(16);
});

test('the mobile navigation chips are reachable and scroll inside their own row', async ({
  page,
}) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width >= 1024, 'the desktop layout uses the sidebar instead');

  await inspect(page);
  const chips = page.getByTestId('mobile-nav');
  await expect(chips).toBeVisible();
  const fits = await chips.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  // Either it fits, or it scrolls internally — never the page.
  const contained = await chips.evaluate((el) => getComputedStyle(el).overflowX !== 'visible');
  expect(fits || contained).toBe(true);
});
