import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
test('modular Plotly actually renders both timing and OS charts without browser errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await expect(page.locator('.js-plotly-plot')).toHaveCount(4);
  await expect(page.locator('.builder-coverage-panel .barlayer .point').first()).toBeVisible();
  await expect(page.locator('.chart [role="alert"]')).toHaveCount(0);
  await expect(page.locator('.main-svg').first()).toBeVisible();
  expect(errors).toEqual([]);
});
