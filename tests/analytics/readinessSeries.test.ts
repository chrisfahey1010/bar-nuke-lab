import { expect, test } from 'vitest';
import * as summaries from '../../src/analytics/summary';
import { buildContext } from '../../src/data/gameMetadata';
import { parseSheet } from '../../src/data/sheetAdapter';
import { selectRows, DEFAULT_FILTERS } from '../../src/analytics/selectors';
import { csvOf, fullRows } from '../fixtures/helpers';

test('readiness series matches ongoing summaries at every clock second, including endpoint exclusions', () => {
  const ongoing = fullRows('online', '24:00');
  const ended = fullRows('ended', '20:00');
  for (const row of ended) {
    row['AN built time'] = '';
    row['AN Type'] = '';
    row['Other positions covered'] = '';
  }
  const c = buildContext(parseSheet(csvOf([...ongoing, ...ended])));
  const targets = selectRows(c, { ...DEFAULT_FILTERS, role: 'Air' });
  expect(summaries).toHaveProperty('ongoingReadinessSeries');
  const series = summaries.ongoingReadinessSeries(c, targets, 720, 1500);
  expect(series).toHaveLength(781);
  for (const point of series) {
    expect(point).toEqual({
      seconds: point.seconds,
      ...summaries.ongoingSummary(c, targets, point.seconds),
    });
  }
  expect(series.find((point) => point.seconds === 767)?.coverage.percentage).toBe(0);
  expect(series.find((point) => point.seconds === 768)?.coverage).toEqual({
    numerator: 2,
    n: 4,
    percentage: 50,
  });
  expect(series.find((point) => point.seconds === 1200)?.coverage).toEqual({
    numerator: 2,
    n: 2,
    percentage: 100,
  });
  expect(series.find((point) => point.seconds === 1440)?.coverage.percentage).toBeNull();
  expect(series.at(-1)?.own.percentage).toBeNull();

  const reversed = buildContext(
    parseSheet(
      csvOf([
        ...fullRows('covered-ended', '20:00'),
        ...ended.map((row) => ({ ...row, 'Game duration': row['Game duration'] ? '24:00' : '' })),
      ]),
    ),
  );
  const air = selectRows(reversed, { ...DEFAULT_FILTERS, role: 'Air' });
  const fallingCoverage = summaries.ongoingReadinessSeries(reversed, air, 1199, 1200);
  expect(fallingCoverage.map((point) => point.coverage)).toEqual([
    { numerator: 2, n: 4, percentage: 50 },
    { numerator: 0, n: 2, percentage: 0 },
  ]);
  const tech = selectRows(reversed, { ...DEFAULT_FILTERS, role: 'Tech' });
  expect(
    summaries
      .ongoingReadinessSeries(reversed, tech, 1199, 1200)
      .map((point) => point.own.percentage),
  ).toEqual([50, 0]);
});

test('readiness series keeps full provider context and includes partial samples only when enabled', () => {
  const records = fullRows('partial', '').filter((row) => row['Team ID'] === '1');
  const c = buildContext(parseSheet(csvOf(records)));
  const targets = selectRows(c, { ...DEFAULT_FILTERS, role: 'Air', osMax: 0, anType: '$missing' });
  const excluded = summaries.ongoingReadinessSeries(c, targets, 767, 769);
  expect(
    excluded.every((point) => point.own.percentage === null && point.coverage.percentage === null),
  ).toBe(true);
  const included = summaries.ongoingReadinessSeries(c, targets, 767, 769, true);
  expect(included.map((point) => point.coverage.percentage)).toEqual([0, 100, 100]);
  expect(included[1].own).toEqual({ numerator: 0, n: 1, percentage: 0 });
  expect(included[1].coverage).toEqual({ numerator: 1, n: 1, percentage: 100 });
  expect(included[1].placeholderGames).toBe(1);
  expect(included[1].cohort).toContain('partial rosters included');
});

test('readiness series preserves separate unknown exclusions and unavailable coverage', () => {
  const records = fullRows('unknowns');
  const air = records.filter((row) => row.Position === 'Air');
  air[0]['Team ID'] = '';
  air[1]['AN built time'] = '?';
  const c = buildContext(parseSheet(csvOf(records)));
  const targets = selectRows(c, { ...DEFAULT_FILTERS, role: 'Air' });
  const point = summaries.ongoingReadinessSeries(c, targets, 900, 900)[0];
  expect(point.own).toEqual({ numerator: 0, n: 1, percentage: 0 });
  expect(point.coverage).toEqual({ numerator: 0, n: 0, percentage: null });
  expect(point.unknownOwn).toBe(1);
  expect(point.unknownCoverage).toBe(2);
});

test('readiness series includes off-screen milestones without turning post-end readiness into coverage', () => {
  const records = fullRows('outside', '29:00');
  const tech = records.filter((row) => row.Position === 'Tech');
  tech[0]['AN built time'] = '7:00';
  tech[1]['AN built time'] = '27:00';
  const c = buildContext(parseSheet(csvOf(records)));
  const targets = selectRows(c, { ...DEFAULT_FILTERS, role: 'Tech' });
  const series = summaries.ongoingReadinessSeries(c, targets, 720, 1740);
  expect(series[0].own.percentage).toBe(50);
  expect(series.find((point) => point.seconds === 1500)?.own.percentage).toBe(50);
  expect(series.find((point) => point.seconds === 1710)?.own.percentage).toBe(100);
  expect(series.at(-1)?.own.percentage).toBeNull();
  const short = buildContext(parseSheet(csvOf(fullRows('short', '12:30'))));
  expect(
    summaries
      .ongoingReadinessSeries(short, short.dataset.rows, 749, 750)
      .map((point) => point.coverage.percentage),
  ).toEqual([0, null]);
});

test('position-stratified series reconciles ongoing denominators without filtering providers or promoting unknowns', () => {
  const online = fullRows('stratified-online', '24:00');
  const ended = fullRows('stratified-ended', '20:00');
  const partialRows = fullRows('stratified-partial', '').filter((row) => row['Team ID'] === '1');
  for (const row of ended) {
    row['AN built time'] = '';
    row['AN Type'] = '';
    row['Other positions covered'] = '';
    if (row.Position === 'Tech') row.OS = '60';
  }
  for (const row of [...online, ...partialRows].filter((row) => row.Position === 'Tech')) {
    row.OS = '60';
    row['Other positions covered'] = 'Air, Geo';
  }
  const air = online.filter((row) => row.Position === 'Air');
  air[0]['Team ID'] = '';
  air[1]['AN built time'] = '?';
  const c = buildContext(parseSheet(csvOf([...online, ...ended, ...partialRows])));
  const targets = selectRows(c, { ...DEFAULT_FILTERS, osMax: 10 });
  expect([...new Set(targets.map((row) => row.role))]).toEqual(['Air', 'Geo']);
  expect(targets.some((row) => row.role === 'Tech')).toBe(false);
  for (const partial of [false, true]) {
    const aggregate = summaries.ongoingReadinessSeries(c, targets, 720, 1500, partial);
    const stratified = ['Air', 'Geo'].map((role) => {
      const rows = targets.filter((row) => row.role === role);
      return summaries.ongoingReadinessSeries(c, rows, 720, 1500, partial);
    });
    for (const [index, total] of aggregate.entries()) {
      const points = stratified.map((series) => series[index]);
      for (const key of ['own', 'coverage'] as const) {
        expect(points.reduce((sum, point) => sum + point[key].n, 0)).toBe(total[key].n);
        expect(points.reduce((sum, point) => sum + point[key].numerator, 0)).toBe(
          total[key].numerator,
        );
      }
      expect(points.reduce((sum, point) => sum + point.unknownOwn, 0)).toBe(total.unknownOwn);
      expect(points.reduce((sum, point) => sum + point.unknownCoverage, 0)).toBe(
        total.unknownCoverage,
      );
      for (const [roleIndex, role] of ['Air', 'Geo'].entries()) {
        expect(points[roleIndex]).toEqual({
          seconds: total.seconds,
          ...summaries.ongoingSummary(
            c,
            targets.filter((row) => row.role === role),
            total.seconds,
            partial,
          ),
        });
      }
    }
    // Same-team high-OS Tech providers remain available to the retained Geo targets.
    const geoAtEnd = stratified[1].find((point) => point.seconds === 1200)!;
    expect(geoAtEnd.coverage.percentage).toBe(100);
    expect(geoAtEnd.coverage.n).toBe(partial ? 3 : 2);
    expect(stratified[1].at(-1)?.coverage.percentage).toBe(partial ? 100 : null);
    const airAtEnd = stratified[0].find((point) => point.seconds === 1200)!;
    expect(airAtEnd.unknownCoverage).toBe(2);
    expect(airAtEnd.coverage).toEqual(
      partial ? { numerator: 1, n: 1, percentage: 100 } : { numerator: 0, n: 0, percentage: null },
    );
  }
});
