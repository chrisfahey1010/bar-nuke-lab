import { expect, test } from 'vitest';
import { buildContext } from '../../src/data/gameMetadata';
import { parseSheet } from '../../src/data/sheetAdapter';
import { milestones, roleLandmarks } from '../../src/analytics/landmarks';
import { coverage } from '../../src/analytics/coverage';
import { csvOf } from '../fixtures/helpers';
test('summarizes timed builders conditionally, preserving missing-duration descriptive evidence', () => {
  const c = buildContext(
    parseSheet(
      'Game ID,OS,Position,AN built time\n1,20,Tech,11:18\n2,25,Tech,12:00\n2,10,Tech,\n2,15,Tech,?',
    ),
  );
  expect(milestones(c, c.dataset.rows).map((v) => v.seconds)).toEqual([768, 810]);
  expect(roleLandmarks(c, c.dataset.rows)[0]).toMatchObject({
    role: 'Tech',
    n: 2,
    games: 2,
    median: 789,
    unavailable: 2,
  });
  expect(milestones(c, c.dataset.rows, true).map((v) => v.seconds)).toEqual([678, 720]);
});

test('own-builder milestones never substitute allied coverage times or provider OS', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        {
          'Game ID': 'TEST-ONLY-own-builders',
          'Team ID': '1',
          Position: 'Tech',
          OS: '60',
          'AN built time': '12:00',
          'Other positions covered': 'Air, Pond',
          'Game duration': '30:00',
        },
        { 'Game ID': 'TEST-ONLY-own-builders', 'Team ID': '1', Position: 'Air', OS: '7' },
        {
          'Game ID': 'TEST-ONLY-own-builders',
          'Team ID': '1',
          Position: 'Pond',
          OS: '23',
          'AN built time': '18:00',
        },
        {
          'Game ID': 'TEST-ONLY-own-builders',
          Position: 'Geo',
          OS: '0',
          'AN built time': '17:00',
        },
      ]),
    ),
  );
  const air = c.dataset.rows.find((r) => r.role === 'Air')!;
  const pond = c.dataset.rows.find((r) => r.role === 'Pond')!;
  const provider = c.dataset.rows.find((r) => r.role === 'Tech')!;
  for (const target of [air, pond]) {
    expect(coverage(c, target).seconds).toBe(12 * 60 + 90);
    expect(coverage(c, target).providers[0].ref).toBe(provider.ref);
  }
  for (const observed of [false, true]) {
    const offset = observed ? 0 : 90;
    expect(
      milestones(c, c.dataset.rows, observed).map(({ row, seconds }) => ({
        role: row.role,
        os: row.os,
        seconds,
      })),
    ).toEqual([
      { role: 'Tech', os: 60, seconds: 12 * 60 + offset },
      { role: 'Geo', os: 0, seconds: 17 * 60 + offset },
      { role: 'Pond', os: 23, seconds: 18 * 60 + offset },
    ]);
    // A filtered target cohort must not pull in a provider milestone or turn covered Air into a builder.
    expect(milestones(c, [air, pond], observed)).toEqual([
      { row: pond, seconds: 18 * 60 + offset },
    ]);
  }
});

test('own-builder milestones preserve invalid timing and match-end eligibility in each basis', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        {
          'Game ID': 'TEST-ONLY-endpoints',
          Position: 'Air',
          OS: '10',
          'AN built time': '?',
          'Game duration': '20:00',
        },
        { 'Game ID': 'TEST-ONLY-endpoints', Position: 'Pond', OS: '20', 'AN built time': '21:00' },
        { 'Game ID': 'TEST-ONLY-endpoints', Position: 'Geo', OS: '30', 'AN built time': '19:00' },
        { 'Game ID': 'TEST-ONLY-endpoints', Position: 'Tech', OS: '40', 'AN built time': '18:30' },
        { 'Game ID': 'TEST-ONLY-endpoints', Position: 'Front1', OS: '50', 'AN Type': 'Citadel' },
      ]),
    ),
  );
  expect(milestones(c, c.dataset.rows).map(({ row, seconds }) => [row.role, seconds])).toEqual([
    ['Tech', 20 * 60],
  ]);
  expect(
    milestones(c, c.dataset.rows, true).map(({ row, seconds }) => [row.role, seconds]),
  ).toEqual([
    ['Tech', 18 * 60 + 30],
    ['Geo', 19 * 60],
  ]);
});
