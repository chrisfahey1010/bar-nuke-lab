import { expect, test } from 'vitest';
import { analyzeFrontSituation as analyze } from '../../src/analytics/frontSituation';
import { ongoingSummary } from '../../src/analytics/summary';
import { buildContext } from '../../src/data/gameMetadata';
import { parseSheet } from '../../src/data/sheetAdapter';
import { csvOf } from '../fixtures/helpers';
import type { RawRow } from '../../src/domain/types';

const row = (game: string, time: string, front: string, extra: RawRow = {}): RawRow => ({
  'Game ID': game,
  'Team ID': '1',
  Position: 'Tech',
  OS: '25',
  'AN built time': time,
  'Front situation upon AN build': front,
  'Game duration': '30:00',
  ...extra,
});

test('keeps front categories tied to valid owned build events and exposes disjoint exclusions', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        row('valid', '10:00', ' advantage '),
        row('nonbuilder', '', ''),
        row('context-only', '', 'Advantage'),
        row('invalid', '?', 'Equal'),
        row('missing-context', '12:00', ''),
        row('unknown-context', '12:00', 'Winning?'),
        row('late', '25:01', 'Disadvantage'),
        row('after-end', '12:00', 'Equal', { 'Game duration': '11:00' }),
        row('allied', '', '', { Position: 'Air' }),
      ]),
    ),
  );
  const result = analyze(c, c.dataset.rows, true);
  expect(
    result.points.map((p: { front: string; seconds: number; row: { gameId: string } }) => [
      p.row.gameId,
      p.front,
      p.seconds,
    ]),
  ).toEqual([['valid', 'Advantage', 600]]);
  expect(result.exclusions).toEqual({
    nonbuilders: 3,
    unavailableTiming: 2,
    missingFront: 1,
    unrecognizedFront: 1,
    laterBuilds: 1,
    modeledAfterEnd: 0,
  });
  expect(result.frontWithoutTiming).toBe(2);
  expect(
    result.points.length +
      Object.values(result.exclusions).reduce((sum: number, n) => sum + Number(n), 0),
  ).toBe(c.dataset.rows.length);
});

test('summarizes within position with median/IQR, game counts and descriptive Equal-baseline differences', () => {
  const records = Array.from({ length: 5 }, (_, i) => [
    row(`pair-${i}`, `${10 + i}:00`, 'Equal'),
    row(`pair-${i}`, `${9 + i}:00`, 'Advantage', { 'Team ID': '2' }),
  ]).flat();
  records.push(row('sparse', '12:00', 'Advantage', { Position: 'Air' }));
  const c = buildContext(parseSheet(csvOf(records)));
  const result = analyze(c, c.dataset.rows, true);
  expect(result).toHaveProperty('groups');
  const advantage = result.groups.find(
    (group) => group.role === 'Tech' && group.front === 'Advantage',
  )!;
  expect(advantage.n).toBe(5);
  expect(advantage.games).toHaveLength(5);
  expect(advantage.median).toBe(660);
  expect([advantage.q1, advantage.q3]).toEqual([600, 720]);
  expect(advantage.summaryEligible).toBe(true);
  expect(advantage.deltaEqual).toBe(-60);
  expect(result.groups.find((group) => group.role === 'Air')?.deltaEqual).toBeNull();
  expect(result.groups.find((group) => group.role === 'Air')?.summaryEligible).toBe(false);
  const modeled = analyze(c, c.dataset.rows);
  expect(
    modeled.groups.find((group) => group.role === 'Tech' && group.front === 'Advantage')?.median,
  ).toBe(750);
  expect(
    modeled.groups.find((group) => group.role === 'Tech' && group.front === 'Advantage')
      ?.deltaEqual,
  ).toBe(-60);
});

test('completion cutoff stays inclusive and basis-independent while modeled after-end events are excluded', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        row('boundary', '25:00', 'Equal'),
        row('later', '25:01', 'Advantage'),
        row('end', '19:00', 'Equal', { 'Game duration': '20:00' }),
        row('early', '9:00', 'Disadvantage'),
      ]),
    ),
  );
  const observed = analyze(c, c.dataset.rows, true);
  expect(observed.points.map((point) => point.row.gameId)).toEqual(['boundary', 'end', 'early']);
  const modeled = analyze(c, c.dataset.rows);
  expect(modeled.points.map((point) => [point.row.gameId, point.seconds])).toEqual([
    ['boundary', 1590],
    ['early', 630],
  ]);
  expect(modeled.exclusions.laterBuilds).toBe(1);
  expect(modeled.exclusions.modeledAfterEnd).toBe(1);
  expect(observed.exclusions.laterBuilds).toBe(1);
});

test('many builders from too few matches cannot qualify a summary or Equal comparison', () => {
  const c = buildContext(
    parseSheet(
      csvOf(
        Array.from({ length: 6 }, (_, i) => [
          row(`cluster-${i % 2}`, `${10 + i}:00`, 'Equal'),
          row(`cluster-${i % 2}`, `${9 + i}:00`, 'Advantage', { 'Team ID': '2' }),
        ]).flat(),
      ),
    ),
  );
  const result = analyze(c, c.dataset.rows, true);
  expect(result.groups.every((group) => group.n === 6 && group.games.length === 2)).toBe(true);
  expect(result.groups.every((group) => !group.summaryEligible && group.deltaEqual === null)).toBe(
    true,
  );
});

test('descriptive events exactly at game end differ from ongoing-game eligibility', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        row('ready-at-end', '18:30', 'Equal', { 'Game duration': '20:00' }),
        row('complete-at-end', '20:00', 'Equal', { 'Game duration': '20:00' }),
      ]),
    ),
  );
  expect(analyze(c, c.dataset.rows, true).points).toHaveLength(2);
  expect(analyze(c, c.dataset.rows).points.map((point) => point.seconds)).toEqual([1200]);
  expect(ongoingSummary(c, c.dataset.rows, 1200, true).own.n).toBe(0);
});
