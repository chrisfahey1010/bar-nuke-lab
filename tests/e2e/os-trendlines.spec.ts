import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
import { csvOf } from '../fixtures/helpers';
import { ROLES } from '../../src/data/normalize';

// TEST-ONLY data: Tech follows OS = (time in minutes - 16)² + 10.
const curveCsv = csvOf([
  ...[12, 14, 16, 18, 22].map((minute) => ({
    'Game ID': `TEST-ONLY-${minute}`,
    OS: String((minute - 16) ** 2 + 10),
    Position: 'Tech',
    'AN built time': `${minute}:00`,
    'AN Type': 'Citadel',
  })),
  { 'Game ID': 'TEST-ONLY-unranked', OS: '-1', Position: 'Tech', 'AN built time': '20:00' },
  { 'Game ID': 'TEST-ONLY-air', OS: '20', Position: 'Air', 'AN built time': '13:00' },
]);

test('quadratic role curves and points toggle independently without changing the cohort', async ({
  page,
}) => {
  await mockSheet(page, curveCsv);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText('7');
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  const os = page.locator('.os-view');
  const points = os.getByRole('checkbox', { name: 'Plotted points', exact: true });
  const trends = os.getByRole('checkbox', { name: 'Quadratic trendlines', exact: true });
  await expect(points).toBeChecked();
  await expect(trends).toBeChecked();
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
  const plot = os.locator('.js-plotly-plot');
  const state = () =>
    plot.evaluate((node) => {
      const g = node as unknown as {
        data: {
          mode: string;
          name: string;
          x: number[];
          y: number[];
          line?: { color: string };
          marker?: { color: string };
          customdata?: string[];
        }[];
        _fullLayout: { yaxis: { range: number[] } };
      };
      return { data: g.data, range: g._fullLayout.yaxis.range };
    });
  const initial = await state();
  const curve = initial.data.find((d) => d.mode === 'lines')!;
  expect(curve.line!.color).toBe(initial.data.find((d) => d.name === 'Tech')!.marker!.color);
  expect(curve.x[0]).toBe(13.5);
  expect(curve.x.at(-1)).toBe(23.5);
  curve.y.forEach((y, i) => expect(y).toBeCloseTo((curve.x[i] - 17.5) ** 2 + 10, 6));
  expect(curve.customdata).toBeUndefined();
  await os.locator('.scatterlayer .point').nth(1).click({ force: true });
  await expect(page.getByRole('complementary', { name: 'Selected record evidence' })).toContainText(
    'Game TEST-ONLY-14 · Tech',
  );
  await points.uncheck();
  await expect(os.locator('.point')).toHaveCount(0);
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
  expect((await state()).range).toEqual(initial.range);
  await trends.uncheck();
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(0);
  await expect(
    os.getByText('Both layers are hidden. Enable points or trendlines to show the graph.'),
  ).toBeVisible();
  await points.check();
  await expect(os.locator('.point')).toHaveCount(7);
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(0);
  await trends.check();
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
  await expect(os.getByText(/No curve: Air/)).toBeVisible();
  await expect(page.getByTestId('player-count')).toHaveText('7');
});

test('compact chart has a position color key and shares keyboard layer preferences with the full view', async ({
  page,
}) => {
  await mockSheet(page, curveCsv);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const os = page.locator('.os-view');
  await expect(os.getByRole('list', { name: 'Position color key' })).toContainText('Tech');
  const points = os.getByRole('checkbox', { name: 'Plotted points', exact: true });
  await points.focus();
  await points.press('Space');
  await expect(points).not.toBeChecked();
  await expect(os.locator('.point')).toHaveCount(0);
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  await expect(points).not.toBeChecked();
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
  const trends = os.getByRole('checkbox', { name: 'Quadratic trendlines', exact: true });
  await trends.focus();
  await trends.press('Space');
  await expect(trends).not.toBeChecked();
  await page.getByRole('tab', { name: 'Timing Window', exact: true }).click();
  await expect(points).not.toBeChecked();
  await expect(trends).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('fits follow filters and timing basis, and position legend toggles do not filter source records', async ({
  page,
}) => {
  await mockSheet(page, curveCsv);
  await page.goto('/');
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  const os = page.locator('.os-view');
  const plot = os.locator('.js-plotly-plot');
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
  const curve = () =>
    plot.evaluate((node) => {
      const g = node as unknown as { data: { mode: string; x: number[]; y: number[] }[] };
      return g.data.find((d) => d.mode === 'lines')!;
    });
  const modeled = await curve();
  await page.getByLabel('Timing basis').selectOption('observed');
  await expect.poll(async () => (await curve()).x[0]).toBe(12);
  const observed = await curve();
  observed.x.forEach((x, i) => expect(x + 1.5).toBeCloseTo(modeled.x[i], 9));
  observed.y.forEach((y, i) => expect(y).toBeCloseTo(modeled.y[i], 9));
  await os.getByRole('button', { name: 'Tech', exact: true }).click();
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(0);
  await expect(os.locator('.point')).toHaveCount(1);
  await expect(page.getByTestId('player-count')).toHaveText('7');
  await os.getByRole('button', { name: 'Tech', exact: true }).click();
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
  await page.getByLabel('OS maximum', { exact: true }).fill('30');
  await expect(page.getByTestId('player-count')).toHaveText('6');
  await expect.poll(async () => (await curve()).x.at(-1)).toBe(18);
  await page.getByLabel('Game', { exact: true }).selectOption('TEST-ONLY-12');
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(0);
  await expect(os.getByText(/No curve: Tech \(1 ranked\)/)).toBeVisible();
});

test('ranked zero is fitted, repeated times do not invent a curve, and off-screen records remain in fits', async ({
  page,
}) => {
  const csv = csvOf([
    ...[7, 12, 16, 22, 27].map((minute) => ({
      'Game ID': `TEST-ONLY-tech-${minute}`,
      OS: String((minute - 16) ** 2 / 10 + 10),
      Position: 'Tech',
      'AN built time': `${minute}:00`,
    })),
    ...[12, 14, 16].map((minute) => ({
      'Game ID': `TEST-ONLY-air-${minute}`,
      OS: '0',
      Position: 'Air',
      'AN built time': `${minute}:00`,
    })),
    ...[12, 12, 16].map((minute, i) => ({
      'Game ID': `TEST-ONLY-pond-${i}`,
      OS: '20',
      Position: 'Pond',
      'AN built time': `${minute}:00`,
    })),
    { 'Game ID': 'TEST-ONLY-invalid', OS: '20', Position: 'Air', 'AN built time': '?' },
    { 'Game ID': 'TEST-ONLY-unknown-os', OS: '', Position: 'Air', 'AN built time': '15:00' },
  ]);
  await mockSheet(page, csv);
  await page.goto('/');
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  const os = page.locator('.os-view');
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(2);
  await os.getByRole('checkbox', { name: 'Plotted points', exact: true }).uncheck();
  await expect(os.locator('.point')).toHaveCount(0);
  const fits = await os.locator('.js-plotly-plot').evaluate((node) => {
    const g = node as unknown as {
      data: {
        mode: string;
        name: string;
        x: number[];
        y: number[];
        hovertemplate: string;
        line: { dash: string };
      }[];
      _fullLayout: { xaxis: { range: number[] } };
    };
    return { curves: g.data.filter((d) => d.mode === 'lines'), range: g._fullLayout.xaxis.range };
  });
  expect(fits.range).toEqual([12, 25]);
  const tech = fits.curves.find((d) => d.name.startsWith('Tech'))!;
  expect(tech.x[0]).toBe(8.5);
  expect(tech.x.at(-1)).toBe(28.5);
  tech.y.forEach((y, i) => expect(y).toBeCloseTo((tech.x[i] - 17.5) ** 2 / 10 + 10, 6));
  const air = fits.curves.find((d) => d.name.startsWith('Air'))!;
  expect(air.y.every((y) => y === 0)).toBe(true);
  expect(air.line.dash).toBe('dot');
  expect(air.hovertemplate).not.toContain('R²');
  await expect(os.getByText(/No curve: Pond \(3 ranked\)/)).toBeVisible();
  await expect(os.getByText(/Dotted curves: only 3 ranked builders/)).toBeVisible();
});

test('hiding a position survives independent layer changes without changing the cohort', async ({
  page,
}) => {
  await mockSheet(
    page,
    csvOf([
      ...ROLES.flatMap((role) =>
        [12, 14, 16, 18, 22].map((minute) => ({
          'Game ID': `TEST-ONLY-${role}-${minute}`,
          OS: String((minute - 16) ** 2 + 10),
          Position: role,
          'AN built time': `${minute}:00`,
        })),
      ),
    ]),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  const os = page.locator('.os-view');
  await os.getByRole('button', { name: 'Air', exact: true }).click();
  await expect(os.locator('.point')).toHaveCount(35);
  await os.getByRole('checkbox', { name: 'Quadratic trendlines', exact: true }).uncheck();
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(0);
  await expect(os.locator('.point')).toHaveCount(35);
  await expect(page.getByTestId('player-count')).toHaveText('40');
  const air = os.getByRole('button', { name: 'Air', exact: true });
  await expect(air).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('tab', { name: 'Timing Window', exact: true }).click();
  await expect(air).toHaveAttribute('aria-pressed', 'false');
  await expect(os.locator('.point')).toHaveCount(35);
  const points = os.getByRole('checkbox', { name: 'Plotted points', exact: true });
  await points.uncheck();
  await expect(os.locator('.point')).toHaveCount(0);
  await points.check();
  await expect(os.locator('.point')).toHaveCount(35);
  await os.getByRole('checkbox', { name: 'Quadratic trendlines', exact: true }).check();
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(7);
  await air.focus();
  await air.press('Space');
  await expect(air).toHaveAttribute('aria-pressed', 'true');
  await expect(os.locator('.point')).toHaveCount(40);
  await expect(os.locator('.scatterlayer .js-line')).toHaveCount(8);
});

test('mobile full chart keeps axis titles within bounds and clear of a dense position legend', async ({
  page,
}) => {
  await mockSheet(
    page,
    csvOf([
      ...ROLES.flatMap((role) =>
        [12, 14, 16, 18, 22].map((minute) => ({
          'Game ID': `TEST-ONLY-${role}-${minute}`,
          OS: String((minute - 16) ** 2 + 10),
          Position: role,
          'AN built time': `${minute}:00`,
        })),
      ),
      { 'Game ID': 'TEST-ONLY-unranked', OS: '-1', Position: 'Tech', 'AN built time': '20:00' },
    ]),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'OS Relationship' }).click();
  const os = page.locator('.os-view');
  for (const pointsVisible of [true, false]) {
    await os
      .getByRole('checkbox', { name: 'Plotted points', exact: true })
      .setChecked(pointsVisible);
    await expect(os.locator('.scatterlayer .js-line')).toHaveCount(8);
    const bounds = await os.locator('.js-plotly-plot').evaluate((node) => ({
      plot: node.getBoundingClientRect().toJSON(),
      x: node.querySelector('.xtitle')!.getBoundingClientRect().toJSON(),
      y: node.querySelector('.ytitle')!.getBoundingClientRect().toJSON(),
      key: node
        .closest('.os-view')!
        .querySelector('.os-color-key')!
        .getBoundingClientRect()
        .toJSON(),
      ticks: [...node.querySelectorAll('.ytick text')]
        .filter((n) => ['0', 'U'].includes(n.textContent!))
        .map((n) => ({ text: n.textContent, bounds: n.getBoundingClientRect().toJSON() })),
    }));
    expect(bounds.y.top).toBeGreaterThanOrEqual(bounds.plot.top);
    expect(bounds.y.bottom).toBeLessThanOrEqual(bounds.plot.bottom);
    await expect(os.locator('.legend')).toHaveCount(0);
    expect(bounds.key.top).toBeGreaterThanOrEqual(bounds.plot.bottom);
    expect(bounds.x.bottom).toBeLessThan(bounds.key.top);
    expect(bounds.ticks.find((t) => t.text === '0')!.bounds.bottom).toBeLessThan(
      bounds.ticks.find((t) => t.text === 'U')!.bounds.top,
    );
  }
});
