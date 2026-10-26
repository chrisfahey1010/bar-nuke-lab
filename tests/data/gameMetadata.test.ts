import { expect, test } from 'vitest';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
const header = 'Game ID,Team ID,OS,Position,AN built time,Game duration,Replay name';
test('aggregates once-per-game metadata, never treating match-local team IDs as global', () => {
  const c = buildContext(
    parseSheet(
      header +
        '\na,1,25,Tech,11:18,30:00,literal stem\na,2,10,Air,,,\nb,1,25,Tech,12:00,20:00,other.sdfz',
    ),
  );
  expect(c.games.size).toBe(2);
  expect(c.games.get('a')?.duration).toBe(1800);
  expect(c.games.get('a')?.replay).toBe('literal stem');
  expect(c.games.get('b')?.replay).toBe('other.sdfz');
  expect(c.games.get('a')?.teams).toEqual({ '1': 1, '2': 1, unknown: 0 });
  expect(c.games.get('a')?.roster).toBe('partial');
});
test('conflicting source metadata stays unavailable while endpoint uses a labeled placeholder', () => {
  const g = buildContext(
    parseSheet(header + '\na,1,25,Tech,11:18,30:00,one\na,2,10,Air,,31:00,two'),
  ).games.get('a')!;
  expect(g.recordedDuration).toBeNull();
  expect(g.duration).toBe(1800);
  expect(g.durationSource).toBe('placeholder');
  expect(g.replay).toBeNull();
  expect(g.issues.map((i) => i.field)).toContain('Game duration');
  expect(g.issues.map((i) => i.field)).toContain('Replay name');
  const agree = buildContext(
    parseSheet(header + '\na,1,25,Tech,,30:00,one\na,2,10,Air,,0:30:00,one'),
  ).games.get('a')!;
  expect(agree.duration).toBe(1800);
  expect(agree.replay).toBe('one');
  const invalid = buildContext(
    parseSheet(header + '\na,1,25,Tech,,?,one\na,2,10,Air,,30:00,one'),
  ).games.get('a')!;
  expect(invalid.recordedDuration).toBeNull();
  expect(invalid.duration).toBe(1800);
  expect(invalid.durationSource).toBe('placeholder');
  expect(invalid.durationTokens).toEqual(['?', '30:00']);
  expect(invalid.issues.some((i) => i.field === 'Game duration')).toBe(true);
});
