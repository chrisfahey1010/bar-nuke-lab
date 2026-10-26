import { test, expect } from '@playwright/test';
import { mockSheet } from './helpers';
import { csvOf } from '../fixtures/helpers';
import { parseSheet } from '../../src/data/sheetAdapter';

// TEST-ONLY: covered Air never builds; Pond builds later than its allied Tech provider.
// Missing OS occurs in a third game, which must not inflate the OS-point game count.
const ownCsv = csvOf([
  {
    'Game ID': 'TEST-ONLY-own',
    'Team ID': '1',
    Position: 'Tech',
    OS: '60',
    'AN built time': '12:00',
    'Other positions covered': 'Air, Pond',
    'Game duration': '30:00',
  },
  { 'Game ID': 'TEST-ONLY-own', 'Team ID': '1', Position: 'Air', OS: '7' },
  {
    'Game ID': 'TEST-ONLY-own',
    'Team ID': '1',
    Position: 'Pond',
    OS: '23',
    'AN built time': '18:00',
  },
  { 'Game ID': 'TEST-ONLY-second', Position: 'Tech', OS: '30', 'AN built time': '14:00' },
  { 'Game ID': 'TEST-ONLY-second', Position: 'Tech', OS: '0', 'AN built time': '16:00' },
  { 'Game ID': 'TEST-ONLY-missing-os', Position: 'Geo', OS: '', 'AN built time': '15:00' },
  { 'Game ID': 'TEST-ONLY-own', Position: 'Pond', OS: '-1', 'AN built time': '20:00' },
]);
const rows = parseSheet(ownCsv).rows;
const expectedPoints = (observed: boolean) =>
  rows
    .filter((r) => r.role !== 'Air' && r.os !== null)
    .map((r) => ({
      ref: r.ref,
      x: Number(r.raw['AN built time'].split(':')[0]) + (observed ? 0 : 1.5),
      y: r.unranked ? -5 : r.os,
    }))
    .sort((a, b) => a.ref.localeCompare(b.ref));

test('compact and full OS charts label and plot only own AN builders with their own OS', async ({
  page,
}) => {
  await mockSheet(page, ownCsv);
  await page.goto('/');
  await expect(page.getByTestId('player-count')).toHaveText(String(rows.length));
  const os = page.locator('.os-view');
  const plot = os.locator('.js-plotly-plot');
  const pointState = () =>
    plot.evaluate((node) => {
      const g = node as unknown as {
        data: { mode: string; x: number[]; y: number[]; customdata?: string[] }[];
      };
      return g.data
        .filter((d) => d.mode === 'markers')
        .flatMap((d) => d.x.map((x, i) => ({ ref: d.customdata![i], x, y: d.y[i] })))
        .sort((a, b) => a.ref.localeCompare(b.ref));
    });
  for (const tab of ['Timing Window', 'OS Relationship']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    for (const observed of [false, true]) {
      await page.getByLabel('Timing basis').selectOption(observed ? 'observed' : 'modeled');
      await expect.poll(pointState).toEqual(expectedPoints(observed));
      await expect(os.getByRole('heading')).toHaveText(
        tab === 'Timing Window' ? 'OS · own AN builders' : 'OS and own AN timing',
      );
      await expect(os.locator('.section-head .muted')).toHaveText('5 OS points · 2 games');
      await expect(
        os.getByText('Own AN only, not received coverage. 1 missing OS omitted.'),
      ).toBeVisible();
      await expect(os.locator('.scatterlayer .point')).toHaveCount(5);
      await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
    }
  }
  const curve = await plot.evaluate((node) => {
    const g = node as unknown as {
      data: {
        mode: string;
        hovertemplate?: string;
        customdata?: string[];
        line?: { color: string };
        marker?: { color: string };
      }[];
      _fullData: { mode: string; hoverinfo: string }[];
    };
    const fitted = g.data.find((d) => d.mode === 'lines')!;
    return {
      hoverinfo: g._fullData.find((d) => d.mode === 'lines')!.hoverinfo,
      hovertemplate: fitted.hovertemplate,
      customdata: fitted.customdata,
      color: fitted.line!.color,
      pointColor: g.data.find((d) => d.mode === 'markers')!.marker!.color,
    };
  });
  expect(curve.hoverinfo).toBe('skip');
  expect(curve.hovertemplate).toBeUndefined();
  expect(curve.customdata).toBeUndefined();
  expect(curve.color).toBe(curve.pointColor);
  // Tech's middle marker lies exactly on its three-point quadratic fit.
  const marker = os.locator('.scatterlayer .point').nth(1);
  await marker.hover({ force: true });
  await expect(os.locator('.hoverlayer')).toContainText('Own AN builder · own OS 30');
  await expect(os.locator('.hoverlayer')).toContainText(
    'Own completion 14:00 · modeled own readiness 15:30',
  );
  await marker.click({ force: true });
  await expect(page.getByRole('complementary', { name: 'Selected record evidence' })).toContainText(
    'Game TEST-ONLY-second · Tech',
  );
  await os.locator('.os-chart-guide summary').click();
  await expect(os.locator('.os-chart-guide')).toContainText('OS = a + b·t + c·t²');
  await expect(os.locator('.os-chart-guide')).toContainText(
    'not a prediction of build time from OS or a causal effect',
  );
});

test('own-builder counts stay cohort-based across layers, target filters and desktop/mobile layouts', async ({
  page,
}) => {
  await mockSheet(page, ownCsv);
  const os = page.locator('.os-view');
  const plot = os.locator('.js-plotly-plot');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    for (const tab of ['Timing Window', 'OS Relationship']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(os.locator('.scatterlayer .point')).toHaveCount(5);
      await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
      const bounds = await plot.evaluate((node) => ({
        plot: node.getBoundingClientRect().toJSON(),
        svg: node.querySelector('.main-svg')!.getBoundingClientRect().toJSON(),
        titles: [...node.querySelectorAll('.xtitle, .ytitle')].map((title) =>
          title.getBoundingClientRect().toJSON(),
        ),
        endpoints: [...node.querySelectorAll('.xtick text')]
          .filter((tick) => ['12:00', '25:00'].includes(tick.textContent!))
          .map((tick) => tick.getBoundingClientRect().toJSON()),
        panel: node.closest('.os-view')!.getBoundingClientRect().toJSON(),
        caption: node
          .closest('.os-view')!
          .querySelector('.os-fit-note p')!
          .getBoundingClientRect()
          .toJSON(),
      }));
      expect(bounds.plot.height).toBe(tab === 'Timing Window' ? 230 : 340);
      expect(bounds.svg.height).toBe(bounds.plot.height);
      expect(bounds.endpoints).toHaveLength(2);
      for (const text of [...bounds.titles, ...bounds.endpoints]) {
        expect(text.width).toBeGreaterThan(0);
        expect(text.left).toBeGreaterThanOrEqual(bounds.plot.left);
        expect(text.right).toBeLessThanOrEqual(bounds.plot.right);
        expect(text.top).toBeGreaterThanOrEqual(bounds.plot.top);
        expect(text.bottom).toBeLessThanOrEqual(bounds.plot.bottom);
      }
      expect(bounds.caption.left).toBeGreaterThanOrEqual(bounds.panel.left);
      expect(bounds.caption.right).toBeLessThanOrEqual(bounds.panel.right);
      expect(bounds.caption.bottom).toBeLessThanOrEqual(bounds.panel.bottom);
      if (width === 1440 && tab === 'Timing Window') {
        expect(bounds.caption.bottom).toBeLessThanOrEqual(900);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const points = os.getByRole('checkbox', { name: 'Plotted points', exact: true });
      const trends = os.getByRole('checkbox', { name: 'Quadratic trendlines', exact: true });
      await points.uncheck();
      await expect(os.locator('.scatterlayer .point')).toHaveCount(0);
      await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
      const hoverPoint = await plot.evaluate((node) => {
        const g = node as unknown as {
          data: { mode: string; x: number[]; y: number[] }[];
          _fullLayout: {
            xaxis: { _offset: number; l2p: (x: number) => number };
            yaxis: { _offset: number; l2p: (y: number) => number };
          };
        };
        const curve = g.data.find((d) => d.mode === 'lines')!;
        const i = Math.floor(curve.x.length / 2);
        const box = node.getBoundingClientRect();
        return {
          x: box.left + g._fullLayout.xaxis._offset + g._fullLayout.xaxis.l2p(curve.x[i]),
          y: box.top + g._fullLayout.yaxis._offset + g._fullLayout.yaxis.l2p(curve.y[i]),
        };
      });
      await page.mouse.move(0, 0);
      await page.mouse.move(hoverPoint.x, hoverPoint.y);
      await expect(os.locator('.hoverlayer')).toContainText('3 ranked own AN builders');
      await expect(os.locator('.section-head .muted')).toHaveText('5 OS points · 2 games');
      await trends.uncheck();
      await expect(os.locator('.scatterlayer .js-line')).toHaveCount(0);
      await expect(os.locator('.section-head .muted')).toHaveText('5 OS points · 2 games');
      await points.check();
      await expect(os.locator('.scatterlayer .point')).toHaveCount(5);
      await trends.check();
      await expect(os.locator('.scatterlayer .js-line')).toHaveCount(1);
      await os.getByRole('button', { name: 'Tech', exact: true }).click();
      await expect(os.locator('.scatterlayer .point')).toHaveCount(2);
      await expect(os.locator('.scatterlayer .js-line')).toHaveCount(0);
      await expect(os.locator('.section-head .muted')).toHaveText('5 OS points · 2 games');
      await os.getByRole('button', { name: 'Tech', exact: true }).click();
      await expect(os.locator('.scatterlayer .point')).toHaveCount(5);
    }
  }
  await page.getByLabel('Role', { exact: true }).selectOption('Air');
  await expect(os.locator('.scatterlayer .point')).toHaveCount(0);
  await expect(os.locator('.section-head .muted')).toHaveText('0 OS points · 0 games');
  await page.getByLabel('Role', { exact: true }).selectOption('Pond');
  await expect(os.locator('.scatterlayer .point')).toHaveCount(2);
  await expect(os.locator('.section-head .muted')).toHaveText('2 OS points · 1 game');
  expect(
    await plot.evaluate((node) => {
      const g = node as unknown as { data: { mode: string; x: number[]; y: number[] }[] };
      return g.data.filter((d) => d.mode === 'markers').map((d) => [d.x[0], d.y[0]]);
    }),
  ).toEqual([
    [19.5, 23],
    [21.5, -5],
  ]);
  await page.getByLabel('Role', { exact: true }).selectOption('Tech');
  await page.getByLabel('Game', { exact: true }).selectOption('TEST-ONLY-own');
  await expect(os.locator('.scatterlayer .point')).toHaveCount(1);
  await expect(os.locator('.section-head .muted')).toHaveText('1 OS point · 1 game');
  await page.getByLabel('Game', { exact: true }).selectOption('');
  await page.getByLabel('Role', { exact: true }).selectOption('Geo');
  await expect(os.locator('.scatterlayer .point')).toHaveCount(0);
  await expect(os.locator('.section-head .muted')).toHaveText('0 OS points · 0 games');
  await expect(
    os.getByText('Own AN only, not received coverage. 1 missing OS omitted.'),
  ).toBeVisible();
});
