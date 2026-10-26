import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
import { csvOf, fullRows } from '../fixtures/helpers';
test('type without completion is unknown in the selected evidence, not a confirmed nonbuilder', async ({
  page,
}) => {
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  const rows = fullRows('TEST-ONLY-contradiction');
  rows[0]['AN built time'] = '';
  rows[0]['AN Type'] = 'Citadel';
  await page.getByLabel('Import CSV/JSON file').setInputFiles({
    name: 'TEST-ONLY-contradiction.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csvOf(rows)),
  });
  await expect(page.getByTestId('player-count')).toHaveText('16');
  await page.getByRole('button', { name: 'Inspect source row 2', exact: true }).click();
  const evidence = page.getByRole('complementary', { name: 'Selected record evidence' });
  await expect(evidence).toContainText('Completion not recorded · needs review');
  await expect(evidence.locator('.record-stats')).not.toContainText('No owned AN by game end');
});
