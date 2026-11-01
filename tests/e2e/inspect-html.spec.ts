import { expect, test } from '@playwright/test';

/**
 * Mode A: paste HTML. This is the fully client-side path and the one every
 * deployment supports, so it gets the deepest coverage.
 */

const COMPLETE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>Designing for trust</title>
    <meta name="description" content="A practical guide to building interfaces people believe in, with real examples and numbers." />
    <link rel="canonical" href="https://example.com/trust" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="https://example.com/icon.png" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Example Blog" />
    <meta property="og:title" content="Designing for trust" />
    <meta property="og:description" content="A practical guide to building interfaces people believe in." />
    <meta property="og:image" content="https://example.com/cover.png" />
    <meta property="og:url" content="https://example.com/trust" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@example" />
    <meta name="twitter:title" content="Designing for trust" />
    <meta name="twitter:description" content="A practical guide to building interfaces people believe in." />
  </head>
  <body><h1>Designing for trust</h1></body>
</html>`;

const MESSY_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <title>夏季新品发布会预告：三个系列、二十七款产品与背后三年研发投入的完整说明</title>
    <title>第二个 title</title>
    <meta name="description" content="Short." />
    <meta name="description" content="Another description." />
    <meta name="robots" content="noindex, follow" />
    <meta property="og:image" content="/images/cover.jpg" />
    <meta name="twitter:card" content="huge_card" />
  </head>
  <body><h1>Messy</h1></body>
</html>`;

async function pasteHtml(page: import('@playwright/test').Page, html: string) {
  await page.getByRole('tab', { name: /paste html/i }).click();
  await page.locator('#html-input').fill(html);
  await page.getByTestId('inspect-html').click();
}

test.beforeEach(async ({ page }) => {
  // Keep the suite hermetic: never hit third-party image hosts.
  await page.route(/^https:\/\/(?!127\.0\.0\.1|localhost).*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i, (route) =>
    route.abort(),
  );
  await page.goto('/');
});

test('parses pasted HTML and shows the extracted meta values', async ({ page }) => {
  await pasteHtml(page, COMPLETE_HTML);

  await expect(page.getByTestId('health-score')).toBeVisible();
  await expect(page.locator('code', { hasText: 'og:title' }).first()).toBeVisible();

  // The generated markup mirrors what was parsed.
  const code = await page.getByTestId('generated-code').innerText();
  expect(code).toContain('<title>Designing for trust</title>');
  expect(code).toContain('<meta property="og:title" content="Designing for trust" />');
  expect(code).toContain('<meta name="twitter:card" content="summary_large_image" />');
});

test('reports duplicates, invalid card types and noindex', async ({ page }) => {
  await pasteHtml(page, MESSY_HTML);

  await expect(page.getByText(/appears 2 times|Found 2 <title>/i).first()).toBeVisible();
  const findings = await page.getByRole('listitem').allInnerTexts();
  const joined = findings.join('\n');
  expect(joined).toMatch(/noindex/i);
  expect(joined).toMatch(/huge_card/);
});

test('explains why a URL cannot be fetched instead of faking a result', async ({ page }) => {
  await page.locator('#url-input').fill('https://example.com');
  await page.getByTestId('inspect-url').click();

  const error = page.getByTestId('inspect-error');
  await expect(error).toBeVisible({ timeout: 20_000 });
  await expect(error).toContainText(/could not fetch|无法抓取/i);

  // The fallback path is offered and actually switches tabs.
  await error.getByRole('button', { name: /paste the html source|粘贴 HTML 源码/i }).click();
  await expect(page.locator('#html-input')).toBeVisible();
});

test('handles empty and hostile input without crashing', async ({ page }) => {
  await page.getByRole('tab', { name: /paste html/i }).click();
  await page.locator('#html-input').fill('<script>window.xss = true</script>');
  await page.getByTestId('inspect-html').click();

  await expect(page.getByTestId('health-score')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { xss?: boolean }).xss)).toBeUndefined();

  await page.getByRole('tab', { name: /paste html/i }).click();
  await page.locator('#html-input').fill('');
  await page.getByTestId('inspect-html').click();
  await expect(page.getByTestId('inspect-error')).toHaveCount(0);
});
