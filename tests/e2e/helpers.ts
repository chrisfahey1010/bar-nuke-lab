import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
export const actualCsv = readFileSync('tests/fixtures/observations.csv', 'utf8');
export async function mockSheet(page: Page, csv = actualCsv) {
  await page.route('https://docs.google.com/spreadsheets/**/export?*', (route) =>
    route.fulfill({
      contentType: 'text/csv',
      body: csv,
      headers: { 'access-control-allow-origin': '*' },
    }),
  );
}
