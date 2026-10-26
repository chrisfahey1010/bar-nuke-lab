import { defineConfig } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({
  ...config,
  use: { ...config.use, baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  outputDir: 'test-results-preview',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-preview', open: 'never' }]],
});
