import { expect, test } from 'vitest';
import { parseSheet } from '../../src/data/sheetAdapter';
import { readiness } from '../../src/analytics/readiness';
const row = (type: string, time = '11:18') =>
  parseSheet(`Game ID,OS,Position,AN built time,AN Type\n1,25,Tech,${time},${type}`).rows[0];
test('adds exactly 90 seconds for all known and missing types, retaining completion', () => {
  for (const type of ['Citadel', 'Umbrella', 'Oasis', '']) {
    const r = readiness(row(type));
    expect(r.modeledSeconds).toBe(768);
    expect(r.completion).toMatchObject({ seconds: 678 });
    expect(r.interpretable).toBe(true);
  }
});
test('does not invent readiness for blanks or present post-termination readiness as an in-game event', () => {
  expect(readiness(row('', '')).modeledSeconds).toBeNull();
  expect(readiness(row('Citadel', '')).interpretable).toBe(false);
  expect(readiness(row('Citadel', '?')).interpretable).toBe(false);
  const after = readiness(row('Citadel'), 750);
  expect(after.modeledSeconds).toBe(768);
  expect(after.inGameSeconds).toBeNull();
  expect(after.outsideMatch).toBe(true);
  expect(readiness(row('Citadel'), 600).interpretable).toBe(false);
});
