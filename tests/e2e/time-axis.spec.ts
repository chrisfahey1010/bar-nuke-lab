import { test, expect } from '@playwright/test';
import { mockSheet, actualCsv } from './helpers';
import { parseSheet } from '../../src/data/sheetAdapter';
import { csvOf, fullRows } from '../fixtures/helpers';

test('OS charts put 12:00–25:00 readiness on X and OS on Y in both sizes and timing modes', async ({
  page,
}) => {
  const csv = csvOf([
    ...parseSheet(actualCsv).rows.map((r) => r.raw),
    { 'Game ID': 'TEST-ONLY-unranked', OS: '-1', Position: 'Tech', 'AN built time': '12:00' },
  ]);
  await mockSheet(page, csv);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('68');
  const os = page.locator('.os-view');
  await expect(os.locator('.xtitle')).toHaveText('Modeled AN readiness (m:ss)');
  await expect(os.locator('.ytitle')).toHaveText('OS (U = Unranked)');
  await expect(os.locator('.xtick text').first()).toHaveText('12:00');
  await expect(os.locator('.xtick text').last()).toHaveText('25:00');
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  await expect(os.locator('.xtitle')).toHaveText('Modeled AN readiness (m:ss)');
  const plot = os.locator('.js-plotly-plot');
  const values = await plot.evaluate((node) => {
    const g = node as unknown as {
      _fullLayout: { xaxis: { range: number[] } };
      data: { x: number[]; y: number[]; name: string }[];
    };
    return {
      range: g._fullLayout.xaxis.range,
      first: { x: g.data[0].x[0], y: g.data[0].y[0] },
      unranked: g.data.filter((d) => d.name.includes('Unranked')).flatMap((d) => d.y),
    };
  });
  expect(values.range).toEqual([12, 25]);
  expect(values.first).toEqual({ x: 12.7, y: 30 });
  expect(values.unranked.length).toBeGreaterThan(0);
  expect(values.unranked.every((os) => os === -5)).toBe(true);
  await page.getByLabel('Timing basis').selectOption('observed');
  await expect(os.locator('.xtitle')).toHaveText('Observed completion (m:ss)');
  await expect(os.locator('.ytitle')).toHaveText('OS (U = Unranked)');
  await expect(os.locator('.xtick text').first()).toHaveText('12:00');
  await expect(os.locator('.xtick text').last()).toHaveText('25:00');
  await expect
    .poll(() =>
      plot.evaluate((node) => (node as unknown as { data: { x: number[] }[] }).data[0].x[0]),
    )
    .toBe(11.2);
});

test('both time endpoints render visibly inside compact, full and mobile chart bounds', async ({
  page,
}) => {
  await mockSheet(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.os-view .xtitle')).toBeVisible();
    for (const tab of ['Timing Window', 'OS Relationship']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      const plots = page.locator('.timing-panel .js-plotly-plot, .os-view .js-plotly-plot');
      for (let i = 0; i < (await plots.count()); i++) {
        const plot = plots.nth(i);
        for (const text of ['12:00', '25:00']) {
          const tick = plot
            .locator('.xtick text')
            .filter({ hasText: new RegExp('^' + text + '$') });
          await expect(tick).toBeVisible();
          const bounds = await tick.evaluate((node) => ({
            text: node.getBoundingClientRect().toJSON(),
            chart: node.closest('.js-plotly-plot')!.getBoundingClientRect().toJSON(),
          }));
          expect(bounds.text.width).toBeGreaterThan(0);
          expect(bounds.text.left).toBeGreaterThanOrEqual(bounds.chart.left);
          expect(bounds.text.right).toBeLessThanOrEqual(bounds.chart.right);
        }
      }
    }
  }
});

test('Timing Window stays at 12:00–25:00 while retaining early and late observations', async ({
  page,
}) => {
  const records = fullRows('TEST-ONLY-outside-window');
  const tech = records.filter((r) => r.Position === 'Tech');
  tech[0]['AN built time'] = '7:00';
  tech[1]['AN built time'] = '27:00';
  await mockSheet(page, csvOf(records));
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('16');
  const readiness = page.locator('.timing-grid .js-plotly-plot').first();
  await expect(readiness.locator('.xtick text').first()).toHaveText('12:00');
  await expect(readiness.locator('.xtick text').last()).toHaveText('25:00');
  const inspect = () =>
    readiness.evaluate((node) => {
      const g = node as unknown as {
        _fullLayout: { xaxis: { range: number[] } };
        data: { name: string; x: number[]; y: number[] }[];
      };
      const tech = g.data.find((trace) => trace.name === 'Tech · recorded target coverage')!;
      return {
        name: tech.name,
        range: g._fullLayout.xaxis.range,
        x: [tech.x[0], tech.x.at(-1)],
        y: [tech.y[0], tech.y.at(-1)],
      };
    });
  expect(await inspect()).toEqual({
    name: 'Tech · recorded target coverage',
    range: [12, 25],
    x: [12, 25],
    y: [50, 50],
  });
  await page.getByRole('slider', { name: 'Game clock', exact: true }).press('End');
  await expect.poll(async () => (await inspect()).range).toEqual([12, 25]);
  await page.getByLabel('Timing basis').selectOption('observed');
  await expect(page.locator('.os-view .xtitle')).toHaveText('Observed completion (m:ss)');
  expect(await inspect()).toEqual({
    name: 'Tech · recorded target coverage',
    range: [12, 25],
    x: [12, 25],
    y: [50, 50],
  });
  await expect(page.getByTestId('timed-count')).toHaveText('2');
  expect((await inspect()).range).toEqual([12, 25]);
});
