import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
const h = 'Game ID,Team ID,OS,Position,AN built time';
test('infers full rosters from complete context while preserving explicit 8/8 and unknown teams', () => {
  const c = buildContext(parseSheet(readFileSync('tests/fixtures/observations.csv', 'utf8')));
  expect([...c.games.values()].filter((g) => g.roster === 'full').map((g) => g.id)).toEqual([
    '1',
    '3',
    '7',
  ]);
  expect(c.games.get('1')?.teams).toEqual({ '1': 8, '2': 8, unknown: 0 });
  expect(c.games.get('5')?.teams.unknown).toBe(5);
});
test('flags duplicate-looking full rosters and unexpected role repetitions without deduplication', () => {
  const d = parseSheet(h + '\n' + Array.from({ length: 16 }, () => 'x,1,20,Tech,11:18').join('\n'));
  const g = buildContext(d).games.get('x')!;
  expect(g.rows).toHaveLength(16);
  expect(g.roster).toBe('review');
  expect(g.issues.some((i) => i.message.includes('Duplicate-looking'))).toBe(true);
  expect(g.issues.some((i) => i.message.includes('Repeated role'))).toBe(true);
  expect(
    buildContext(
      parseSheet(h + '\n' + Array.from({ length: 17 }, (_, i) => `x,1,${i},Tech,`).join('\n')),
    ).games.get('x')?.roster,
  ).toBe('review');
});
test('reviews excessive role repetition even when all team labels are unknown', () => {
  const g = buildContext(
    parseSheet(h + '\n' + Array.from({ length: 16 }, (_, i) => `x,,${i},Tech,`).join('\n')),
  ).games.get('x')!;
  expect(g.roster).toBe('review');
  expect(g.teams.unknown).toBe(16);
});
