import { defineConfig, devices } from '@playwright/test';

const PORT = 4380;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // MetaLens ships dark-first; pin it so theme assertions are deterministic.
    colorScheme: 'dark',
    // Pin the language: the host system locale must not decide which UI the
    // selectors run against.
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'iphone-13',
      use: { ...devices['iPhone 13'], locale: 'en-US' },
    },
    {
      name: 'iphone-se',
      use: {
        ...devices['iPhone SE'],
        // 320px is the narrowest realistic iPhone width. Layout at this size is
        // engine-independent CSS, so this profile runs on Chromium (which is
        // stable in CI); WebKit rendering is covered by the iphone-13 project.
        browserName: 'chromium',
        viewport: { width: 320, height: 568 },
        locale: 'en-US',
      },
    },
  ],
  webServer: {
    // A dedicated port: another app on this machine may already hold 4173.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    // Never reuse an existing server — it may belong to a different project.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
