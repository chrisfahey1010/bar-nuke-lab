import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
import { csvOf } from '../fixtures/helpers';
import type { RawRow } from '../../src/domain/types';

const builder = (game: string, os: string, coverage: string, extra: RawRow = {}): RawRow => ({
  'Game ID': game,
  'Team ID': '1',
  Position: 'Tech',
  OS: os,
  'AN built time': '14:00',
  'Other positions covered': coverage,
  'Game duration': '30:00',
  ...extra,
});
const records = [
  builder('TEST-ONLY-ZERO', '0', ''),
  builder('TEST-ONLY-ONE', '9.5', 'Tech; Air; air'),
  builder('TEST-ONLY-MULTI', '30', 'Air,Geo,Pond'),
  builder('TEST-ONLY-U', '-1', 'Air'),
  builder('TEST-ONLY-MULTI', '40', '', { Position: 'Air', 'AN built time': '' }),
];

test('additional-position coverage uses builders own OS, with zero/one/multi shares and source evidence', async ({
  page,
}) => {
  await mockSheet(page, csvOf(records));
  await page.goto('/');
  const panel = page.locator('.builder-coverage-panel');
  await expect(panel.getByRole('heading', { name: 'OS & neighboring coverage' })).toBeVisible();
  await expect(panel.getByTestId('coverage-builder-count')).toHaveText('4');
  await expect(panel).toContainText('Blank cells mean none recorded, not confirmed poor placement');
  const plot = panel.locator('.js-plotly-plot');
  await expect(plot.locator('.barlayer .point')).toHaveCount(9);
  await expect(plot.locator('.barlayer .bartext')).toHaveCount(0);
  await plot
    .locator('.barlayer .trace')
    .nth(1)
    .locator('.point path')
    .first()
    .hover({ force: true });
  await expect(plot.locator('.hoverlayer')).toContainText('Builder OS 0–<10');
  await expect(plot.locator('.hoverlayer')).toContainText('1 additional position: 1/2 builders');
  const data = () =>
    plot.evaluate((node) =>
      (node as unknown as { data: { x: number[]; customdata?: unknown }[] }).data.map((t) => ({
        x: t.x,
        source: t.customdata,
      })),
    );
  expect(await data()).toEqual([
    { x: [50, 0, 0], source: undefined },
    { x: [50, 0, 100], source: undefined },
    { x: [0, 100, 0], source: undefined },
  ]);
  await page.getByLabel('Timing basis').selectOption('observed');
  expect(await data()).toEqual([
    { x: [50, 0, 0], source: undefined },
    { x: [50, 0, 100], source: undefined },
    { x: [0, 100, 0], source: undefined },
  ]);
  await panel.getByText('Coverage rates & builder records', { exact: true }).click();
  const rates = panel.getByRole('table', {
    name: 'Recorded additional coverage rates by builder OS band',
  });
  await expect(rates).toContainText('50.0%');
  await panel.getByRole('button', { name: 'Inspect TEST-ONLY-MULTI · Tech' }).click();
  await expect(page.locator('.record-identity')).toContainText('TEST-ONLY-MULTI');
  await page.getByLabel('Role', { exact: true }).selectOption('Air');
  await expect(panel.getByTestId('coverage-builder-count')).toHaveText('0');
  await expect(panel).toContainText('No eligible own AN builders');
  await page.getByRole('button', { name: 'Methodology', exact: true }).click();
  const methodology = page.getByRole('dialog');
  await expect(methodology).toContainText('All roles shows recorded target coverage per position');
  await expect(methodology).toContainText('Builder OS and additional coverage');
  await expect(methodology).toContainText(
    'OS charts use each builder’s own completion/readiness and own OS',
  );
});

test('coverage plot keeps its physical height after filter rerenders and desktop/mobile resizing', async ({
  page,
}) => {
  await mockSheet(
    page,
    csvOf([...records, builder('TEST-ONLY-GEO', '25', 'Air', { Position: 'Geo' })]),
  );
  await page.goto('/');
  const panel = page.locator('.builder-coverage-panel');
  const plot = panel.locator('.js-plotly-plot');
  for (const [role, n] of [
    ['', '5'],
    ['Tech', '4'],
    ['', '5'],
  ]) {
    await page.getByLabel('Role', { exact: true }).selectOption(role);
    await expect(panel.getByTestId('coverage-builder-count')).toHaveText(n);
    await expect
      .poll(() =>
        plot.evaluate(
          (node) => (node as unknown as { data?: { y: string[] }[] }).data?.[0].y.length,
        ),
      )
      .toBe(role ? 3 : 4);
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        plot.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const svg = node.querySelector('.main-svg')!.getBoundingClientRect();
          return Math.max(
            Math.abs(rect.width - svg.width),
            Math.abs(rect.height - svg.height),
            Math.abs(rect.height - 240),
          );
        }),
      )
      .toBeLessThanOrEqual(1);
  }
});
