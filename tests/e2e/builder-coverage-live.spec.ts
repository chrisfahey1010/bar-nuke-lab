import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
import { parseElapsed } from '../../src/domain/time';
import { ROLES } from '../../src/data/normalize';
import { SOURCE_URL } from '../../src/data/snapshot';
import { runtimeLabel } from './helpers';

test('live builder coverage bars reconcile with recorded own builders in desktop and mobile', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const responsePromise = page.waitForResponse(
    (r) =>
      r.status() === 200 &&
      (r.url().includes('googleusercontent.com/export') ||
        r.url().includes('/export?format=csv&gid=0')),
    { timeout: 30000 },
  );
  await page.goto('/');
  const response = await responsePromise;
  const csv = await response.text();
  const context = buildContext(parseSheet(csv));
  const panel = page.locator('.builder-coverage-panel');
  await expect(page.locator('.source-text')).toContainText('Google CSV · fresh retrieval');
  const reference = (role = '') => {
    const buckets = new Map<number, { n: number; counts: number[]; refs: string[] }>();
    for (const row of context.dataset.rows) {
      if (role && row.role !== role) continue;
      const parsed = parseElapsed(row.raw['AN built time']);
      if (
        !row.usable ||
        parsed.kind !== 'valid' ||
        !ROLES.includes(row.role) ||
        row.os === null ||
        parsed.seconds > context.games.get(row.gameId)!.duration!
      )
        continue;
      if (!context.dataset.headers.includes('Other positions covered')) continue;
      const listed = row.coveredRoles.filter((r) => r.trim());
      if (listed.some((r) => !ROLES.includes(r))) continue;
      const extra = new Set(listed.filter((r) => r !== row.role)).size;
      const key = row.unranked ? Number.POSITIVE_INFINITY : Math.floor(row.os / 10) * 10;
      const bucket = buckets.get(key) ?? { n: 0, counts: [0, 0, 0], refs: [] };
      bucket.n++;
      bucket.counts[Math.min(2, extra)]++;
      bucket.refs.push(row.ref);
      buckets.set(key, bucket);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([key, b]) => ({
        label: Number.isFinite(key) ? `${key}–<${key + 10}` : 'Unranked',
        ...b,
      }));
  };
  const check = async (role = '') => {
    const expected = reference(role);
    await expect(panel.getByTestId('coverage-builder-count')).toHaveText(
      String(expected.reduce((n, b) => n + b.n, 0)),
    );
    if (!expected.length) return { role, n: 0, bands: [] };
    const plot = panel.locator('.js-plotly-plot');
    await expect
      .poll(() =>
        plot.evaluate(
          (node) =>
            (node as unknown as { data?: { type: string; x: number[]; y: string[] }[] }).data
              ?.filter((t) => t.type === 'bar')
              .map((t) => t.x) ?? [],
        ),
      )
      .toEqual([0, 1, 2].map((i) => expected.map((b) => (b.counts[i] * 100) / b.n)));
    expect(
      await plot.evaluate((node) => (node as unknown as { data: { y: string[] }[] }).data[0].y),
    ).toEqual(expected.map((b) => b.label));
    await panel.getByText('Coverage rates & builder records', { exact: true }).click();
    const sourceRows = panel
      .getByRole('table', { name: 'Own AN builder coverage source records' })
      .locator('tbody tr');
    await expect(sourceRows).toHaveCount(expected.reduce((n, b) => n + b.n, 0));
    await panel.getByText('Coverage rates & builder records', { exact: true }).click();
    return { role, n: expected.reduce((n, b) => n + b.n, 0), bands: expected };
  };
  const cohorts = [await check()];
  await page.getByLabel('Role', { exact: true }).selectOption('Tech');
  cohorts.push(await check('Tech'));
  await page.getByLabel('Role', { exact: true }).selectOption('');
  await check();
  const views = [];
  const kind = runtimeLabel(testInfo.project.use.baseURL);
  mkdirSync(testInfo.outputDir, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const plot = panel.locator('.js-plotly-plot');
    await expect
      .poll(() =>
        plot.evaluate((node) =>
          Math.max(
            Math.abs(
              node.getBoundingClientRect().width -
                node.querySelector('.main-svg')!.getBoundingClientRect().width,
            ),
            Math.abs(
              node.getBoundingClientRect().height -
                node.querySelector('.main-svg')!.getBoundingClientRect().height,
            ),
          ),
        ),
      )
      .toBeLessThanOrEqual(1);
    const bounds = await plot.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        clipped: [...node.querySelectorAll('.xtitle, .ytick text, .xtick text')]
          .filter((label) => {
            const r = label.getBoundingClientRect();
            return (
              r.width <= 0 ||
              r.left < rect.left - 1 ||
              r.right > rect.right + 1 ||
              r.top < rect.top - 1 ||
              r.bottom > rect.bottom + 1
            );
          })
          .map((label) => label.textContent),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(bounds.clipped).toEqual([]);
    expect(bounds.overflow).toBe(false);
    const screenshot = testInfo.outputPath(`builder-coverage-live-${kind}-${width}.png`);
    await panel.screenshot({ path: screenshot });
    views.push({ viewport: width, ...bounds, screenshot });
  }
  writeFileSync(
    testInfo.outputPath(`builder-coverage-live-${kind}.json`),
    JSON.stringify(
      {
        sourceUrl: SOURCE_URL,
        acquiredAt: new Date().toISOString(),
        sourceRows: context.dataset.rows.length,
        cohorts,
        views,
      },
      null,
      2,
    ),
  );
});
