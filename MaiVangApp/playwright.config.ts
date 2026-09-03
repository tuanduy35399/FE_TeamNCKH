import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'artifacts/e2e',
  use: {
    baseURL: 'http://localhost:5175',
    channel: 'msedge',
    viewport: { width: 390, height: 844 },
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
