import { test, expect, type Page } from '@playwright/test';
import { mockSheet } from './helpers';

const HOUR = 60 * 60 * 1000;

async function openClockedDashboard(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.addInitScript(() => {
    const state = window as unknown as Window & { __sheetFetchCount: number };
    state.__sheetFetchCount = 0;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('https://docs.google.com/spreadsheets/') && url.includes('/export?')) {
        state.__sheetFetchCount++;
      }
      return originalFetch(input, init);
    };
  });
  // This is a deterministic transport fixture, not a live-source test.
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await expect(page.getByRole('status').first()).toContainText('fresh retrieval');
}

async function reads(page: Page) {
  return page.evaluate(
    () => (window as unknown as Window & { __sheetFetchCount: number }).__sheetFetchCount,
  );
}

test('auto-refresh waits a full hour while manual refresh remains immediate', async ({ page }) => {
  await openClockedDashboard(page);
  expect(await reads(page)).toBe(1);
  await page.clock.fastForward(5 * 60 * 1000);
  expect(await reads(page)).toBe(1);
  await page.clock.fastForward(55 * 60 * 1000 - 1);
  expect(await reads(page)).toBe(1);
  await page.clock.fastForward(1);
  expect(await reads(page)).toBe(2);
  await expect(page.getByRole('status').first()).toContainText('fresh retrieval');
  await page.getByRole('button', { name: 'Refresh source', exact: true }).click();
  await expect.poll(() => reads(page)).toBe(3);
  await expect(page.getByLabel('Auto-refresh · 1 hour', { exact: true })).toBeChecked();
});

test('auto-refresh respects disabling, re-enabling and hidden tabs', async ({ page }) => {
  await openClockedDashboard(page);
  const auto = page.getByRole('checkbox', { name: /Auto-refresh/ });
  await auto.uncheck();
  await page.clock.fastForward(2 * HOUR);
  expect(await reads(page)).toBe(1);
  await page.getByRole('button', { name: 'Refresh source', exact: true }).click();
  await expect.poll(() => reads(page)).toBe(2);
  await expect(auto).not.toBeChecked();
  await auto.check();
  await page.clock.fastForward(HOUR - 1);
  expect(await reads(page)).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  });
  await page.clock.fastForward(1);
  expect(await reads(page)).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });
  await page.clock.fastForward(HOUR);
  expect(await reads(page)).toBe(3);
});
