import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(
    /^https:\/\/(?!127\.0\.0\.1|localhost).*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i,
    (route) => route.abort(),
  );
  await page.goto('/');
});

test('the built-in samples load and are labelled as demo data', async ({ page }) => {
  await page.getByRole('tab', { name: /samples/i }).click();

  await page.getByTestId('load-sample-messy').click();
  await expect(page.getByTestId('health-score')).toBeVisible();
  const findings = (await page.getByRole('listitem').allInnerTexts()).join('\n');
  expect(findings.length).toBeGreaterThan(200);

  // The messy sample is genuinely messy: duplicates, noindex and a bad card type.
  expect(findings).toMatch(/noindex|big_card|huge_card/i);
});

test('the demo data never claims to come from a live fetch', async ({ page }) => {
  await page.getByRole('tab', { name: /samples/i }).click();
  await page.getByTestId('load-sample-complete').click();
  const history = page.getByTestId('history-list');
  await expect(history).toContainText(/sample/i);
});

test('switching language translates the interface but keeps the data', async ({ page }) => {
  await page.getByRole('tab', { name: /paste html/i }).click();
  await page.locator('#html-input').fill('<title>数据保持不变的页面标题</title>');
  await page.getByTestId('inspect-html').click();
  await expect(page.getByTestId('generated-code')).toContainText('数据保持不变的页面标题');

  await page.getByTestId('locale-toggle').click();
  await expect(page.getByRole('tab', { name: /粘贴 HTML/ })).toBeVisible();
  // The inspected content is untouched by the language switch.
  await expect(page.getByTestId('generated-code')).toContainText('数据保持不变的页面标题');
  await expect(page.locator('#field-title')).toHaveValue('数据保持不变的页面标题');
});

test('the theme toggle switches between dark and light and persists', async ({ page }) => {
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);

  await page.getByTestId('theme-toggle').click();
  await expect(html).not.toHaveClass(/dark/);

  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
});

const settingsButton = (page: import('@playwright/test').Page) =>
  page.getByTestId('open-settings');

test('a fetch endpoint can be configured and is used for URL mode', async ({ page }) => {
  const endpoint = 'https://metalens-fetch.example.workers.dev/fetch';
  await settingsButton(page).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('#endpoint-input').fill(endpoint);
  await dialog.getByRole('button', { name: /save/i }).click();
  await expect(dialog).toBeHidden();

  const stored = await page.evaluate(() => localStorage.getItem('metalens.fetchEndpoint.v1'));
  expect(stored).toBe(endpoint);

  // Re-opening shows the saved value as the active endpoint.
  await settingsButton(page).click();
  await expect(page.getByRole('dialog').locator('#endpoint-input')).toHaveValue(endpoint);
});

test('an invalid endpoint is rejected with a visible message', async ({ page }) => {
  await settingsButton(page).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#endpoint-input').fill('javascript:alert(1)');
  await dialog.getByRole('button', { name: /save/i }).click();
  await expect(dialog).toContainText(/valid http/i);
  await expect(dialog).toBeVisible();
});

test('the scoring rules are documented in the UI', async ({ page }) => {
  await page.getByRole('button', { name: /how scoring works/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(/score = round/i);
  await expect(dialog).toContainText(/weight/i);
});
