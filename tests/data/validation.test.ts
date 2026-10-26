import { expect, test } from 'vitest';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
import { validationIssues } from '../../src/data/validation';
test('queues invalid time, type-without-completion, and source contradictions without erasing rows', () => {
  const c = buildContext(
    parseSheet(
      'Game ID,OS,Position,AN built time,AN Type,Game duration,Nuke built,First Nuke ready,First Nuke launch\n1,20,Tech,?,Citadel,20:00,16:00,15:00,14:00\n1,20,Geo,,Citadel,,,,\n1,20,Air,21:00,,20:00,,,',
    ),
  );
  const issues = validationIssues(c);
  expect(c.dataset.rows).toHaveLength(3);
  expect(issues.filter((i) => i.field === 'AN built time')).toHaveLength(3);
  expect(issues.some((i) => i.message.includes('before silo'))).toBe(true);
});
test('timestamps beyond an assumed endpoint are not labeled as beyond a recorded game end', () => {
  const c = buildContext(parseSheet('Game ID,OS,Position,AN built time\n1,20,Tech,31:00'));
  expect(
    validationIssues(c).some(
      (i) => i.message === 'Observed timestamp is after effective game end (placeholder endpoint)',
    ),
  ).toBe(true);
});
test('queues a launch before silo even when nuclear ammo was not recorded', () => {
  const context = buildContext(
    parseSheet(
      'Game ID,OS,Position,AN built time,Nuke built,First Nuke launch\n1,20,Tech,11:18,20:00,19:00',
    ),
  );
  expect(
    validationIssues(context).some(
      (i) => i.field === 'First Nuke launch' && i.message.includes('before silo'),
    ),
  ).toBe(true);
});
