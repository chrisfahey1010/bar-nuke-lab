import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'hosting/**/*.spec.ts'],
  use: { ...config.use, baseURL: 'http://127.0.0.1:8787' },
  webServer: {
    command: 'npm run build && npm run worker:dev',
    url: 'http://127.0.0.1:8787',
    reuseExistingServer: false,
    timeout: 120000,
  },
  outputDir: 'test-results-worker',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-worker', open: 'never' }],
    ['json', { outputFile: 'test-results-worker/results.json' }],
  ],
});
