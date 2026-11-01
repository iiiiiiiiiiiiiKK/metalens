import { expect, test } from '@playwright/test';

const FIRST = `<!doctype html><html lang="en"><head><title>First inspected page</title>
<meta name="description" content="The first page used by the history test, long enough to pass the advisory minimum." />
</head><body></body></html>`;

const SECOND = `<!doctype html><html lang="en"><head><title>Second inspected page</title>
<meta name="description" content="The second page used by the history test, long enough to pass the advisory minimum." />
</head><body></body></html>`;

async function inspect(page: import('@playwright/test').Page, html: string) {
  await page.getByRole('tab', { name: /paste html/i }).click();
  await page.locator('#html-input').fill(html);
  await page.getByTestId('inspect-html').click();
  await expect(page.getByTestId('health-score')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('stores checks in the browser and survives a reload', async ({ page }) => {
  await inspect(page, FIRST);
  await inspect(page, SECOND);

  const list = page.getByTestId('history-list');
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list).toContainText('Second inspected page');

  await page.reload();
  await inspect(page, FIRST);
  await expect(page.getByTestId('history-list').getByRole('listitem')).toHaveCount(2);
});

test('a single entry can be deleted', async ({ page }) => {
  await inspect(page, FIRST);
  const list = page.getByTestId('history-list');
  await expect(list.getByRole('listitem')).toHaveCount(1);

  await list
    .getByRole('button', { name: /remove from history/i })
    .first()
    .click();
  await expect(list).toHaveCount(0);
});

test('clearing history asks for confirmation first', async ({ page }) => {
  await inspect(page, FIRST);
  await page.getByRole('button', { name: /clear/i }).last().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/delete all 1 saved checks/i);

  await dialog.getByRole('button', { name: /cancel/i }).click();
  await expect(page.getByTestId('history-list').getByRole('listitem')).toHaveCount(1);

  await page.getByRole('button', { name: /clear/i }).last().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /delete/i })
    .click();
  await expect(page.getByTestId('history-list')).toHaveCount(0);
});

test('history never leaves the browser', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET') requests.push(`${request.method()} ${request.url()}`);
  });
  await inspect(page, FIRST);
  // Inspecting pasted HTML must not produce a single network write.
  expect(requests).toEqual([]);
});
