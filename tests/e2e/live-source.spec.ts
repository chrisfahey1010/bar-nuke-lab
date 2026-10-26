import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
import { parseElapsed } from '../../src/domain/time';
import { ongoingSummary } from '../../src/analytics/summary';
import { analyzeFrontSituation } from '../../src/analytics/frontSituation';
import { DEFAULT_FILTERS, selectRows } from '../../src/analytics/selectors';
import type { Context, Observation } from '../../src/domain/types';
import { ROLES } from '../../src/data/normalize';
import { ROLE_COLORS } from '../../src/views/OsRelationship';
import { escapeHover } from '../../src/charts/text';
import { formatTime } from '../../src/domain/time';
import { runtimeLabel } from './helpers';

async function expectPositionCoverage(page: Page, c: Context, rows: Observation[]) {
  const retained = new Set(rows.map((row) => row.role));
  const roles = [
    ...ROLES.filter((role) => retained.has(role)),
    ...[...retained].filter((role) => !ROLES.includes(role)).sort(),
  ];
  const expected = roles.map((role) => {
    const targets = rows.filter((row) => row.role === role);
    const series = Array.from({ length: 781 }, (_, index) =>
      ongoingSummary(c, targets, 720 + index),
    );
    return {
      name: `${escapeHover(role)} · recorded target coverage`,
      color: ROLE_COLORS[role] ?? '#b8c5d2',
      x: series.map((_, index) => (720 + index) / 60),
      y: series.map((point) => point.coverage.percentage),
      text: series.map(
        (point, index) =>
          `${formatTime(720 + index)}<br>${point.coverage.numerator}/${point.coverage.n} eligible observations · ${point.games} ongoing games`,
      ),
      connectgaps: false,
      selectable: false,
    };
  });
  await expect
    .poll(() =>
      page.locator('.timing-panel .js-plotly-plot').evaluate((node) =>
        (
          node as unknown as {
            data: {
              name: string;
              line: { color: string };
              x: number[];
              y: (number | null)[];
              text: string[];
              connectgaps: boolean;
              customdata?: unknown;
            }[];
          }
        ).data.map(({ name, line, x, y, text, connectgaps, customdata }) => ({
          name,
          color: line.color,
          x,
          y,
          text,
          connectgaps,
          selectable: customdata !== undefined,
        })),
      ),
    )
    .toEqual(expected);
  return { positions: roles, verifiedSecondsPerCurve: 781 };
}

test('actual browser fetches fresh Google CSV directly without credentials or a dev proxy', async ({
  page,
}, testInfo) => {
  test.setTimeout(45000);
  const response = page.waitForResponse(
    (r) =>
      (r.status() < 300 || r.status() >= 400) &&
      (r.url().includes('googleusercontent.com/export') ||
        r.url().includes('/export?format=csv&gid=0')),
    { timeout: 30000 },
  );
  await page.goto('/');
  const r = await response;
  expect(r.status()).toBe(200);
  const csv = await r.text();
  const d = parseSheet(csv);
  const c = buildContext(d);
  await expect(page.getByText('Google CSV · fresh retrieval', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId('player-count')).toHaveText(String(d.rows.length));
  await expect(page.getByTestId('timed-count')).toHaveText(
    String(d.rows.filter((row) => parseElapsed(row.raw['AN built time']).kind === 'valid').length),
  );
  const readiness = page.locator('.timing-panel .js-plotly-plot');
  await expect(readiness.locator('.ytitle')).toHaveText('AN readiness (%)');
  const readinessVerification = await expectPositionCoverage(page, c, d.rows);
  const front = analyzeFrontSituation(c, d.rows);
  const frontPanel = page.locator('.front-situation-panel');
  await expect(frontPanel.getByTestId('front-point-count')).toHaveText(String(front.points.length));
  const frontPlot = frontPanel.locator('.js-plotly-plot');
  const frontPoints = await frontPlot.evaluate((node) =>
    (node as unknown as { data: { customdata?: string[]; x: number[] }[] }).data
      .filter((trace) => trace.customdata)
      .flatMap((trace) =>
        trace.customdata!.map((ref, i) => ({ ref, seconds: Math.round(trace.x[i] * 60) })),
      )
      .sort((a, b) => a.ref.localeCompare(b.ref)),
  );
  expect(frontPoints).toEqual(
    front.points
      .map((point) => ({ ref: point.row.ref, seconds: point.seconds }))
      .sort((a, b) => a.ref.localeCompare(b.ref)),
  );
  const rendering = [];
  const frontRendering = [];
  mkdirSync(testInfo.outputDir, { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        readiness.evaluate((node) =>
          Math.abs(
            node.getBoundingClientRect().width -
              node.querySelector('.main-svg')!.getBoundingClientRect().width,
          ),
        ),
      )
      .toBeLessThanOrEqual(2);
    const bounds = await readiness.evaluate((node) => {
      const chart = node.getBoundingClientRect();
      return {
        chart: chart.toJSON(),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        titleOverflow: Math.max(
          ...[...node.querySelectorAll('.xtitle, .ytitle')].flatMap((title) => {
            const text = title.getBoundingClientRect();
            return [
              chart.top - text.top,
              text.bottom - chart.bottom,
              chart.left - text.left,
              text.right - chart.right,
            ];
          }),
        ),
      };
    });
    expect(bounds.horizontalOverflow).toBe(false);
    expect(bounds.titleOverflow).toBeLessThanOrEqual(0);
    const screenshot = testInfo.outputPath(
      `readiness-window-live-${runtimeLabel(page.url())}-${width}.png`,
    );
    await page.locator('.timing-panel').screenshot({ path: screenshot });
    rendering.push({ width, ...bounds, screenshot });
    await expect
      .poll(() =>
        frontPlot.evaluate((node) =>
          Math.abs(
            node.getBoundingClientRect().width -
              node.querySelector('.main-svg')!.getBoundingClientRect().width,
          ),
        ),
      )
      .toBeLessThanOrEqual(2);
    const frontBounds = await frontPlot.evaluate((node) => {
      const chart = node.getBoundingClientRect();
      return {
        chart: chart.toJSON(),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        labelOverflow: Math.max(
          ...[...node.querySelectorAll('.xtitle, .xtick text, .ytick text')].flatMap((label) => {
            const text = label.getBoundingClientRect();
            return [
              chart.top - text.top,
              text.bottom - chart.bottom,
              chart.left - text.left,
              text.right - chart.right,
            ];
          }),
        ),
      };
    });
    expect(frontBounds.horizontalOverflow).toBe(false);
    expect(frontBounds.labelOverflow).toBeLessThanOrEqual(0);
    const alignment = await page.evaluate(() => {
      const timing = document.querySelector('.timing-panel')!.getBoundingClientRect();
      const front = document.querySelector('.front-situation-panel')!.getBoundingClientRect();
      const endpoints = (selector: string) => {
        const node = document.querySelector(selector)!;
        const chart = node.getBoundingClientRect();
        const axis = (
          node as unknown as {
            _fullLayout: {
              xaxis: { _offset: number; l2p: (value: number) => number; range: number[] };
            };
          }
        )._fullLayout.xaxis;
        return {
          range: axis.range,
          x: [12, 25].map((value) => chart.left + axis._offset + axis.l2p(value)),
        };
      };
      const a = endpoints('.timing-panel .js-plotly-plot');
      const b = endpoints('.front-situation-panel .js-plotly-plot');
      return {
        widthDifference: Math.abs(timing.width - front.width),
        endpointDifference: Math.max(...a.x.map((x, i) => Math.abs(x - b.x[i]))),
        timing: a,
        front: b,
      };
    });
    expect(alignment.widthDifference).toBeLessThanOrEqual(1);
    expect(alignment.endpointDifference).toBeLessThanOrEqual(1);
    expect(alignment.front.range).toEqual([12, 25]);
    const frontScreenshot = testInfo.outputPath(
      `front-situation-live-${runtimeLabel(page.url())}-${width}.png`,
    );
    await frontPanel.screenshot({ path: frontScreenshot });
    await page.screenshot({
      path: testInfo.outputPath(`front-revision-overview-${runtimeLabel(page.url())}-${width}.png`),
      fullPage: true,
    });
    frontRendering.push({ width, ...frontBounds, alignment, screenshot: frontScreenshot });
  }
  const filteredSituations = [];
  for (const front of ['Advantage', 'Equal', 'Disadvantage']) {
    const rows = selectRows(c, { ...DEFAULT_FILTERS, front });
    const summary = ongoingSummary(c, rows, 900);
    await page.getByLabel('Front situation', { exact: true }).selectOption(front);
    await expect(page.getByTestId('player-count')).toHaveText(String(rows.length));
    await expect(page.getByTestId('denominator')).toContainText(
      `own N=${summary.own.n}; coverage N=${summary.coverage.n}`,
    );
    const verification = await expectPositionCoverage(page, c, rows);
    const selectedFront = analyzeFrontSituation(c, rows);
    await expect(frontPanel.getByTestId('front-point-count')).toHaveText(
      String(selectedFront.points.length),
    );
    if (selectedFront.points.length) {
      const references = selectedFront.points.map((point) => point.row.ref).sort();
      await expect
        .poll(() =>
          frontPanel
            .locator('.js-plotly-plot')
            .evaluate((node) =>
              (node as unknown as { data: { customdata?: string[] }[] }).data
                .flatMap((trace) => trace.customdata ?? [])
                .sort(),
            ),
        )
        .toEqual(references);
    } else await expect(frontPanel.locator('.js-plotly-plot')).toHaveCount(0);
    filteredSituations.push({
      front,
      rows: rows.length,
      points: selectedFront.points.length,
      own: summary.own,
      coverage: summary.coverage,
      verifiedSeconds: verification.verifiedSecondsPerCurve,
      ...verification,
    });
  }
  await page.getByLabel('Front situation', { exact: true }).selectOption('');
  await expect(page.getByTestId('player-count')).toHaveText(String(d.rows.length));
  await expectPositionCoverage(page, c, d.rows);
  const explicitRole =
    readinessVerification.positions.find((role) => role === 'Air') ??
    readinessVerification.positions.find((role) => role !== '')!;
  const roleTargets = selectRows(c, { ...DEFAULT_FILTERS, role: explicitRole });
  await page.getByLabel('Role', { exact: true }).selectOption(explicitRole);
  const roleSeries = Array.from({ length: 781 }, (_, index) =>
    ongoingSummary(c, roleTargets, 720 + index),
  );
  await expect
    .poll(() =>
      readiness.evaluate((node) =>
        (node as unknown as { data: { name: string; y: (number | null)[] }[] }).data.map(
          ({ name, y }) => ({ name, y }),
        ),
      ),
    )
    .toEqual([
      { name: 'Own AN modeled online', y: roleSeries.map((point) => point.own.percentage) },
      { name: 'Recorded target coverage', y: roleSeries.map((point) => point.coverage.percentage) },
    ]);
  const roleSummary = ongoingSummary(c, roleTargets, 900);
  await expect(page.getByTestId('denominator')).toContainText(
    `own N=${roleSummary.own.n}; coverage N=${roleSummary.coverage.n}`,
  );
  await page.getByLabel('Role', { exact: true }).selectOption('');
  await expectPositionCoverage(page, c, d.rows);
  const metrics = {
    url: page.url(),
    responseStatus: r.status(),
    sourceResponseUrl: r.url(),
    retrievedAt: new Date().toISOString(),
    rows: d.rows.length,
    games: c.games.size,
    validAnTimes: d.rows.filter((row) => parseElapsed(row.raw['AN built time']).kind === 'valid')
      .length,
    durations: [...c.games.values()].map((g) => ({
      game: g.id,
      duration: g.duration,
      raw: g.durationTokens,
      durationSource: g.durationSource,
      recordedDuration: g.recordedDuration,
      durationNote: g.durationNote,
    })),
    proxy: false,
    readiness: { ...readinessVerification, explicitRole, rendering },
    frontSituation: {
      points: front.points.length,
      games: front.games.length,
      exclusions: front.exclusions,
      rendering: frontRendering,
      filteredSituations,
    },
  };
  writeFileSync(
    testInfo.outputPath(`live-${runtimeLabel(page.url())}.json`),
    JSON.stringify(metrics, null, 2),
  );
  console.log('LIVE BROWSER', JSON.stringify(metrics));
});
