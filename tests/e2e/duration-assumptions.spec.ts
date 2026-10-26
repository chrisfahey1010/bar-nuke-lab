import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';

test('duration assumptions are visible and used in Tech coverage without changing raw evidence', async ({
  page,
}) => {
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await expect(page.locator('.sample-strip')).toContainText('6 × 30:00 placeholders');
  await expect(page.locator('.sample-strip')).toContainText('1 corrected endpoint');
  await page.getByLabel('Role', { exact: true }).selectOption('Tech');
  const coverage = page
    .locator('.summary-strip .rate-card')
    .filter({ hasText: 'Recorded target coverage' });
  await expect(coverage).toContainText('33.3%');
  await expect(coverage).toContainText('2/6');
  await expect(page.getByTestId('denominator')).toContainText('2 placeholder endpoints');
  await page.getByLabel('Include partial-roster sample').check();
  await expect(coverage).toContainText('41.7%');
  await expect(coverage).toContainText('5/12');
  await page.getByLabel('Game', { exact: true }).selectOption('7');
  await expect(page.getByTestId('duration-evidence')).toHaveText('29:03 · corrected');
  await expect(page.getByRole('complementary', { name: 'Selected record evidence' })).toContainText(
    'User-confirmed correction: 29:03:00 → 29:03',
  );
  await page.getByRole('tab', { name: 'Match Timeline' }).click();
  await expect(page.getByTestId('team-groups')).toContainText('Duration: 29:03 · corrected');
  await page.getByLabel('Game', { exact: true }).selectOption('1');
  await expect(page.getByTestId('duration-evidence')).toHaveText('30:00 · placeholder');
  await page.getByRole('button', { name: 'Methodology', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('30:00 placeholder');
  await expect(page.getByRole('dialog')).toContainText('Game 7');
});
