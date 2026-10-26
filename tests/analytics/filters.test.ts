import { expect, test } from 'vitest';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
import { selectRows, DEFAULT_FILTERS } from '../../src/analytics/selectors';
import { csvOf, fullRows } from '../fixtures/helpers';
import { coverage } from '../../src/analytics/coverage';
import { ongoingSummary } from '../../src/analytics/summary';
const c = buildContext(
  parseSheet(
    'Game ID,Team ID,OS,Position,AN built time,AN Type\n1,1,50,Tech,11:18,Umbrella\n1,1,0,Air,,\n1,2,-1,Air,,\n2,,10,Geo,12:00,Citadel',
  ),
);
test('applies role, numeric OS, Unranked and target AN-type filters without altering full context', () => {
  expect(
    selectRows(c, { ...DEFAULT_FILTERS, role: 'Air', osMin: 0, osMax: 0, includeUnranked: false }),
  ).toHaveLength(1);
  expect(selectRows(c, { ...DEFAULT_FILTERS, role: 'Air' })).toHaveLength(2);
  expect(selectRows(c, { ...DEFAULT_FILTERS, anType: 'Umbrella' })[0].role).toBe('Tech');
  expect(selectRows(c, { ...DEFAULT_FILTERS, game: '2' })[0].gameId).toBe('2');
  expect(c.games.get('1')?.rows).toHaveLength(3);
});

test('front filters match recorded row labels without inferring missing states or losing providers', () => {
  const records = fullRows('TEST-ONLY-front-filter');
  const tech = records.find((r) => r.Position === 'Tech' && r['Team ID'] === '1')!;
  tech['Front situation upon AN build'] = 'Disadvantage';
  tech['Other positions covered'] = 'Geo';
  const geo = records.find((r) => r.Position === 'Geo' && r['Team ID'] === '1')!;
  geo['Front situation upon AN build'] = ' advantage ';
  geo['AN built time'] = '14:00';
  geo['AN Type'] = 'Citadel';
  const equal = records.find((r) => r.Position === 'Geo' && r['Team ID'] === '2')!;
  equal['Front situation upon AN build'] = 'EQUAL';
  equal['AN built time'] = '13:00';
  records.find((r) => r.Position === 'Pond')!['Front situation upon AN build'] = 'Winning?';
  const context = buildContext(parseSheet(csvOf(records)));
  expect(DEFAULT_FILTERS.front).toBe('');
  expect(selectRows(context, DEFAULT_FILTERS)).toHaveLength(16);
  for (const front of ['Advantage', 'Equal', 'Disadvantage'])
    expect(selectRows(context, { ...DEFAULT_FILTERS, front })).toHaveLength(1);
  const targets = selectRows(context, {
    ...DEFAULT_FILTERS,
    front: 'Advantage',
    role: 'Geo',
    osMax: 10,
  });
  expect(targets).toHaveLength(1);
  expect(targets[0].raw['Front situation upon AN build']).toBe(' advantage ');
  expect(context.games.get('TEST-ONLY-front-filter')?.roster).toBe('full');
  const cov = coverage(context, targets[0]);
  expect(cov.seconds).toBe(768);
  expect(cov.providers.some((provider) => provider.role === 'Tech')).toBe(true);
  const summary = ongoingSummary(context, targets, 900);
  expect([summary.own.percentage, summary.coverage.percentage]).toEqual([0, 100]);
  expect(context.dataset.rows).toHaveLength(16);
});
