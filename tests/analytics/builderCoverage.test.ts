import { expect, test } from 'vitest';
import { analyzeBuilderCoverage } from '../../src/analytics/builderCoverage';
import { buildContext } from '../../src/data/gameMetadata';
import { parseSheet } from '../../src/data/sheetAdapter';
import { csvOf } from '../fixtures/helpers';
import type { RawRow } from '../../src/domain/types';

const builder = (game: string, os: string, covered: string, extra: RawRow = {}): RawRow => ({
  'Game ID': game,
  'Team ID': '1',
  Position: 'Tech',
  OS: os,
  'AN built time': '14:00',
  'Other positions covered': covered,
  'Game duration': '30:00',
  ...extra,
});

test('groups own builders by their OS and counts distinct recorded additional positions', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        builder('one', '0', ''),
        builder('two', '9.5', 'Tech; air; Air'),
        builder('three', '10', 'Air, Geo, Pond'),
        builder('three', '-1', 'Air'),
        builder('three', '40', '', { Position: 'Air', 'AN built time': '' }),
      ]),
    ),
  );
  const result = analyzeBuilderCoverage(c, c.dataset.rows);
  expect(result.builders.map((p) => [p.row.os, p.additionalRoles])).toEqual([
    [0, []],
    [9.5, ['Air']],
    [10, ['Air', 'Geo', 'Pond']],
    [-1, ['Air']],
  ]);
  expect(result.bands.map((b) => [b.label, b.n, b.counts, b.percentages, b.games.length])).toEqual([
    ['0–<10', 2, [1, 1, 0], [50, 50, 0], 2],
    ['10–<20', 1, [0, 0, 1], [0, 0, 100], 1],
    ['Unranked', 1, [0, 1, 0], [0, 100, 0], 1],
  ]);
  expect(result.exclusions.nonbuilders).toBe(1);
  expect(result.blankCoverage).toBe(1);
});

test('preserves disjoint exclusions instead of turning unknown records into zero coverage', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        builder('blank', '10', '', { 'AN built time': '' }),
        builder('contradiction', '10', '', { 'AN built time': '', 'AN Type': 'Citadel' }),
        builder('invalid', '10', 'Air', { 'AN built time': '?' }),
        builder('after-end', '10', 'Air', { 'Game duration': '13:59' }),
        builder('unsupported', '10', 'Air', { Position: 'Unknown' }),
        builder('missing-os', '', 'Air'),
        builder('unknown-list', '10', 'Air, mystery'),
        builder('good', '10', 'Tech; Air; Air;;', { 'Team ID': '' }),
      ]),
    ),
  );
  const result = analyzeBuilderCoverage(c, c.dataset.rows);
  expect(result.builders.map((p) => [p.row.gameId, p.additionalRoles])).toEqual([
    ['good', ['Air']],
  ]);
  expect(result.exclusions).toEqual({
    nonbuilders: 1,
    unavailableTiming: 3,
    unsupportedPosition: 1,
    missingOs: 1,
    missingCoverageField: 0,
    unknownCoverage: 1,
  });
  expect(
    result.builders.length + Object.values(result.exclusions).reduce((sum, n) => sum + n, 0),
  ).toBe(c.dataset.rows.length);
  expect(result.blankCoverage).toBe(0);
});

test('uses observed completion eligibility independently of readiness, viewport, and target matching', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        builder('at-end', '20', 'Air', { 'AN built time': '20:00', 'Game duration': '20:00' }),
        builder('late', '20', 'Air, Geo', { 'AN built time': '26:00', 'Team ID': '' }),
        builder('early', '20', '', { 'AN built time': '9:00', 'Game duration': '' }),
      ]),
    ),
  );
  const selected = c.dataset.rows.filter((r) => r.gameId !== 'early');
  const result = analyzeBuilderCoverage(c, selected);
  expect(result.builders.map((p) => [p.row.gameId, p.completion])).toEqual([
    ['at-end', 1200],
    ['late', 1560],
  ]);
  expect(result.bands[0].counts).toEqual([0, 1, 1]);
  expect(analyzeBuilderCoverage(c, c.dataset.rows).builders).toHaveLength(3);
  expect(analyzeBuilderCoverage(c, c.dataset.rows).assumedEndpoints).toBe(1);
});

test('missing coverage column makes builders unavailable rather than zero recorded', () => {
  const c = buildContext(parseSheet('Game ID,OS,Position,AN built time\nmissing,20,Tech,14:00'));
  const result = analyzeBuilderCoverage(c, c.dataset.rows);
  expect(result.builders).toHaveLength(0);
  expect(result.bands).toHaveLength(0);
  expect(result.exclusions.missingCoverageField).toBe(1);
});
