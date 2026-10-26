import { test, expect } from '@playwright/test';
import { mockSheet, actualCsv } from './helpers';
import { parseSheet } from '../../src/data/sheetAdapter';
import { csvOf } from '../fixtures/helpers';
test('actual Plotly point click and box brush link record evidence and cohort counts', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mockSheet(page);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('67');
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  const point = page.locator('.os-view .scatterlayer .point').first();
  await expect(point).toBeVisible();
  await point.click({ force: true });
  await expect(page.getByRole('complementary', { name: 'Selected record evidence' })).toContainText(
    'Game 6 · Tech',
  );
  const plot = page.locator('.os-view .draglayer .nsewdrag');
  // Point inspection focuses the evidence below the charts; return before dragging.
  await plot.scrollIntoViewIfNeeded();
  const box = (await plot.boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height - 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByTestId('player-count')).toHaveText('29');
  await expect(page.getByRole('button', { name: 'Clear linked selection' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear linked selection' }).click();
  await expect(page.getByTestId('player-count')).toHaveText('67');
  expect(errors).toEqual([]);
});
test('unconfirmed long endpoints still expose review and do not inherit the Game 7 correction', async ({
  page,
}) => {
  const csv = csvOf([
    ...parseSheet(actualCsv).rows.map((r) => r.raw),
    {
      'Game ID': 'TEST-ONLY-long',
      OS: '20',
      Position: 'Tech',
      'AN built time': '12:00',
      'Game duration': '29:03:00',
    },
  ]);
  await mockSheet(page, csv);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('68');
  await page.getByRole('button', { name: '1 endpoint review' }).click();
  await expect(page.getByRole('tab', { name: 'Data Explorer' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.validation-list').getByText(/Unusually long endpoint/)).toBeVisible();
});
