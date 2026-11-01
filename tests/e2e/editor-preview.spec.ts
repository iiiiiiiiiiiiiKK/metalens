import { expect, test } from '@playwright/test';

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>Original page title</title>
    <meta name="description" content="Original description that is comfortably long enough to be considered fine by the tool." />
    <link rel="canonical" href="https://example.com/original" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta property="og:title" content="Original OG title" />
    <meta property="og:description" content="Original OG description." />
    <meta property="og:image" content="https://example.com/og.png" />
    <meta property="og:url" content="https://example.com/original" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Original tweet title" />
  </head>
  <body><h1>Original</h1></body>
</html>`;

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(?!127\.0\.0\.1|localhost).*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i, (route) =>
    route.abort(),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: /paste html/i }).click();
  await page.locator('#html-input').fill(HTML);
  await page.getByTestId('inspect-html').click();
  await expect(page.getByTestId('health-score')).toBeVisible();
});

test('editing a field updates every preview immediately', async ({ page }) => {
  const xPreview = page.getByTestId('preview-x');
  await expect(xPreview).toContainText('Original tweet title');

  await page.locator('#field-twitter\\:title').fill('Edited tweet title');

  await expect(xPreview).toContainText('Edited tweet title');
  await expect(xPreview).not.toContainText('Original tweet title');

  // The generated markup follows the edit too.
  const code = await page.getByTestId('generated-code').innerText();
  expect(code).toContain('content="Edited tweet title"');
});

test('switching platform shows that platform’s own fallback chain', async ({ page }) => {
  // X prefers twitter:*, Facebook prefers og:*
  await expect(page.getByTestId('preview-x')).toContainText('Original tweet title');
  await page.getByRole('tab', { name: 'Facebook' }).click();
  await expect(page.getByTestId('preview-facebook')).toContainText('Original OG title');
  await page.getByRole('tab', { name: 'LinkedIn' }).click();
  await expect(page.getByTestId('preview-linkedin')).toContainText('Original OG title');
  await page.getByRole('tab', { name: /wechat/i }).click();
  await expect(page.getByTestId('preview-wechat')).toContainText('Original page title');
});

test('card variants can be forced', async ({ page }) => {
  const media = page.getByTestId('preview-x').getByTestId('card-media');

  await expect(media).toHaveCount(1);
  await page.getByRole('tab', { name: /no image/i }).click();
  await expect(media).toHaveCount(0);

  await page.getByRole('tab', { name: /large image/i }).click();
  await expect(media).toHaveCount(1);

  await page.getByRole('tab', { name: /small image/i }).click();
  await expect(media).toHaveCount(1);
});

test('reset restores the original values', async ({ page }) => {
  await page.getByRole('tab', { name: 'Facebook' }).click();

  await page.locator('#field-og\\:title').fill('Temporary title');
  await expect(page.getByTestId('preview-facebook')).toContainText('Temporary title');

  await page.getByRole('button', { name: /reset to original/i }).click();
  await expect(page.locator('#field-og\\:title')).toHaveValue('Original OG title');
  await expect(page.getByTestId('preview-facebook')).toContainText('Original OG title');
});

test('an unreachable preview image is reported, not invented', async ({ page }) => {
  // The image is aborted by the route handler, so the card must say so.
  await expect(page.getByTestId('preview-x')).toContainText(/could not be loaded|无法加载/i, {
    timeout: 15_000,
  });
});
