import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
test('shared filters link timing, OS view, source table and record evidence', async ({ page }) => {
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await expect(page.getByTestId('timed-count')).toHaveText('29');
  await page.getByLabel('Role', { exact: true }).selectOption('Tech');
  await expect(page.getByTestId('player-count')).toHaveText('12');
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  await expect(page.getByRole('heading', { name: 'OS and own AN timing' })).toBeVisible();
  await page.getByRole('tab', { name: 'Data Explorer' }).click();
  await expect(page.getByTestId('records-table').locator('tbody tr')).toHaveCount(12);
  await page
    .getByTestId('records-table')
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /Inspect/ })
    .click();
  await expect(page.getByRole('complementary', { name: 'Selected record evidence' })).toContainText(
    '11:18',
  );
  await expect(page.getByRole('complementary', { name: 'Selected record evidence' })).toContainText(
    '12:48',
  );
  await page.getByLabel('Timing basis').selectOption('observed');
  await page.getByRole('tab', { name: 'Timing Window' }).click();
  await expect(
    page.getByRole('heading', { name: 'Modeled timing window', exact: true }),
  ).toBeVisible();
});
