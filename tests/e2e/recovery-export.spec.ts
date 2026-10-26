import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { actualCsv, mockSheet } from './helpers';
import { csvOf, fullRows } from '../fixtures/helpers';
test('once-per-game metadata import is explicit and does not write Google', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (r) => {
    if (/google/.test(r.url()) && r.method() !== 'GET') writes.push(r.url());
  });
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  const rows = fullRows('TEST-ONLY-import', '30:00');
  rows[0]['Replay name'] = 'TEST-ONLY-replay-stem';
  const csv = csvOf(rows);
  await page.getByLabel('Import CSV/JSON file').setInputFiles({
    name: 'TEST-ONLY-once-per-game.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await expect(page.getByRole('status').first()).toContainText(
    'Imported · TEST-ONLY-once-per-game.csv',
  );
  await expect(page.getByLabel('Auto-refresh · 5 min')).not.toBeChecked();
  await expect(page.getByTestId('player-count')).toHaveText('16');
  await expect(page.getByRole('region', { name: 'Ongoing-game estimates' })).toContainText('2/16');
  await page.getByRole('tab', { name: 'Match Timeline' }).click();
  await expect(page.getByTestId('team-groups')).toContainText('Duration: 30:00');
  await expect(page.getByLabel('Replay reference', { exact: true })).toHaveValue(
    'TEST-ONLY-replay-stem',
  );
  expect(writes).toEqual([]);
});
test('failed refresh and HTML preserve cached rows; later valid additions appear and are announced', async ({
  page,
}) => {
  let body = actualCsv;
  let status = 200;
  await page.route('https://docs.google.com/spreadsheets/**/export?*', (r) =>
    r.fulfill({ status, contentType: 'text/csv', body }),
  );
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  status = 503;
  await page.getByRole('button', { name: 'Refresh source' }).click();
  await expect(page.getByRole('status').first()).toContainText('Cached · not freshly retrieved');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  status = 200;
  body = '<html>Sign in</html>';
  await page.getByRole('button', { name: 'Refresh source' }).click();
  await expect(page.getByRole('status').first()).toContainText('HTML/login');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  body = csvOf([
    ...Papa.parse<Record<string, string>>(actualCsv, { header: true }).data,
    {
      'Game ID': 'TEST-ONLY-added',
      'Team ID': '1',
      OS: '20',
      Position: 'Tech',
      'AN built time': '11:18',
      'AN Type': 'Citadel',
      Notes: 'read-only transport fixture',
    },
  ]);
  await page.getByRole('button', { name: 'Refresh source' }).click();
  await expect(page.getByTestId('player-count')).toHaveText('68');
  await expect(page.getByRole('status').first()).toContainText('fresh retrieval');
});
test('filtered CSV and JSON downloads retain raw values and model/provider provenance', async ({
  page,
}) => {
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await page.getByLabel('Role', { exact: true }).selectOption('Air');
  await page.getByLabel('Game', { exact: true }).selectOption('1');
  await page.getByRole('tab', { name: 'Data Explorer' }).click();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export filtered CSV' }).click();
  const csv = readFileSync((await (await csvDownload).path())!, 'utf8');
  const records = Papa.parse<Record<string, string>>(csv, { header: true }).data;
  expect(records).toHaveLength(2);
  expect(records[0].Position).toBe('Air');
  expect(records[0].derived_coverage_ready_seconds).toBe('768');
  expect(records[0].derived_coverage_provider_refs).toBe('Sheet1!A5:P5');
  expect(records[0].derived_inferred_roster_status).toBe('full');
  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export filtered JSON' }).click();
  const json = JSON.parse(readFileSync((await (await jsonDownload).path())!, 'utf8'));
  expect(json.records).toHaveLength(2);
  expect(json.selectionScope).toBe('filtered');
});
