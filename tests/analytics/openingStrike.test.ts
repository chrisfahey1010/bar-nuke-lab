import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildContext } from '../../src/data/gameMetadata';
import { parseSheet } from '../../src/data/sheetAdapter';
import { openingStrikes } from '../../src/analytics/openingStrike';
test('preserves opening double-salvo evidence without turning a legacy missile count into episode size', () => {
  const c = buildContext(parseSheet(readFileSync('tests/fixtures/observations.csv', 'utf8')));
  const strike = openingStrikes(c, '3')[0];
  expect(strike.time).toBe(1230);
  expect(strike.teamId).toBe('2');
  expect(strike.targetRoles).toEqual(['Tech', 'Air']);
  expect(strike.notes).toContain('Double nuke');
  expect(strike.legacyCounts).toEqual(['2']);
  expect(strike.salvoSize).toBeNull();
  expect(strike.kind).toBe('launch');
  expect(strike.confirmedEarliest).toBe(false);
  expect(strike.targets).toHaveLength(2);
});
test('team opening chooses earliest first-player launch without pooling later counts or unknown teams', () => {
  const c = buildContext(
    parseSheet(
      'Game ID,Team ID,OS,Position,AN built time,First Nuke launch,Num nukes launched,Notes\n1,1,20,Tech,,20:00,7,first\n1,1,30,Geo,,25:00,9,later player first\n1,,15,Air,,19:00,2,unknown A\n1,,10,Pond,,21:00,3,unknown B',
    ),
  );
  const s = openingStrikes(c, '1');
  expect(s).toHaveLength(3);
  expect(s.find((e) => e.teamId === '1')?.notes).toBe('first');
  expect(s.find((e) => e.teamId === '1')?.legacyCounts).toEqual(['7']);
  expect(s.filter((e) => e.teamId === null)).toHaveLength(2);
});
test('excludes contradictory first-launch chronology rather than converting it to an opening episode', () => {
  const c = buildContext(
    parseSheet(
      'Game ID,Team ID,OS,Position,AN built time,Nuke built,First Nuke ready,First Nuke launch\n1,1,20,Tech,,16:00,18:00,17:00',
    ),
  );
  expect(openingStrikes(c, '1')).toHaveLength(0);
});
