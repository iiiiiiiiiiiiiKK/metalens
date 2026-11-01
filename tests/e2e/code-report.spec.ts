import { expect, test } from '@playwright/test';

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>Tricky "quotes" &amp; &lt;brackets&gt;</title>
    <meta name="description" content="A description with an ampersand &amp; and a &lt;tag&gt;." />
    <link rel="canonical" href="https://example.com/page" />
    <meta property="og:title" content="Tricky &quot;quotes&quot; &amp; &lt;brackets&gt;" />
    <meta property="og:image" content="https://example.com/og.png" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body><h1>Escape</h1></body>
</html>`;

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(?!127\.0\.0\.1|localhost).*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i, (route) =>
    route.abort(),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: /paste html/i }).click();
  await page.locator('#html-input').fill(HTML);
  await page.getByTestId('inspect-html').click();
  await expect(page.getByTestId('generated-code')).toBeVisible();
});

test('generated markup escapes quotes, ampersands and angle brackets', async ({ page }) => {
  const code = await page.getByTestId('generated-code').innerText();
  expect(code).toContain('&quot;quotes&quot;');
  expect(code).toContain('&amp;');
  expect(code).toContain('&lt;brackets&gt;');
  // No raw angle bracket may survive inside a content attribute.
  const rawAttribute = /content="[^"]*<[^"]*"/.exec(code);
  expect(rawAttribute).toBeNull();
});

test('copy all puts the markup on the clipboard', async ({ page, context, browserName }) => {
  if (browserName !== 'chromium') test.skip(true, 'clipboard permissions are chromium-only');

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const code = await page.getByTestId('generated-code').innerText();

  await page.getByRole('button', { name: /copy all/i }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard.replace(/\s+/g, ' ').trim()).toBe(code.replace(/\s+/g, ' ').trim());
});

test('a single tag can be copied from the tag list', async ({ page }) => {
  await page.getByText(/^\d+ tags$/).click();
  const copyButtons = page.getByRole('button', { name: /copy this tag/i });
  await expect(copyButtons.first()).toBeVisible();
  await copyButtons.first().click();
  await expect(page.getByRole('status')).toContainText(/copied|已复制/i);
});

test('the report exports as a real file download', async ({ page }) => {
  const [markdown] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /markdown report/i }).click(),
  ]);
  expect(markdown.suggestedFilename()).toMatch(/metalens-report-.*\.md/);

  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /json data/i }).click(),
  ]);
  expect(json.suggestedFilename()).toMatch(/metalens-report-.*\.json/);
});

test('the code generator switches fields on and off', async ({ page }) => {
  const before = await page.getByTestId('generated-code').innerText();
  expect(before).toContain('twitter:card');

  await page.getByRole('button', { name: 'X Cards', exact: true }).click();
  const after = await page.getByTestId('generated-code').innerText();
  expect(after).not.toContain('twitter:card');
  expect(after).toContain('og:title');
});
