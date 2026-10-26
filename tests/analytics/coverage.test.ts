import { expect, test } from 'vitest';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
import { coverage, NO_COVERAGE_LABEL } from '../../src/analytics/coverage';
import { selectRows, DEFAULT_FILTERS } from '../../src/analytics/selectors';
const h = 'Game ID,Team ID,OS,Position,AN built time,AN Type,Other positions covered';
test('keeps higher-OS allied providers through target role/OS/type filters and takes earliest recorded readiness', () => {
  const c = buildContext(
    parseSheet(
      h +
        '\n1,1,50,Tech,11:18,Umbrella,Air\n1,1,10,Air,,,\n1,1,20,Geo,12:00,Citadel,Air\n2,1,30,Tech,10:00,Citadel,Air\n1,2,30,Tech,09:00,Citadel,Air',
    ),
  );
  const target = selectRows(c, {
    ...DEFAULT_FILTERS,
    role: 'Air',
    osMax: 15,
    anType: '$missing',
  })[0];
  const cov = coverage(c, target);
  expect(cov.seconds).toBe(768);
  expect(cov.providers).toHaveLength(2);
  expect(cov.providers[0].role).toBe('Tech');
  expect(cov.incomplete).toBe(true);
  expect(NO_COVERAGE_LABEL).toBe('No recorded coverage yet');
});
test('preserves own readiness with unknown team, blocks unknown-team allied matches and exposes ambiguous targets', () => {
  const c = buildContext(
    parseSheet(
      h +
        '\n1,,25,Tech,11:18,Citadel,Air\n1,,15,Air,,,\n1,1,10,Air,,,\n1,1,12,Air,,,\n1,1,30,Geo,10:00,Citadel,Air',
    ),
  );
  expect(coverage(c, c.dataset.rows[0]).seconds).toBe(768);
  expect(coverage(c, c.dataset.rows[1]).seconds).toBeNull();
  expect(coverage(c, c.dataset.rows[1]).status).toBe('unknown');
  expect(coverage(c, c.dataset.rows[2]).ambiguous).toBe(true);
  expect(coverage(c, c.dataset.rows[2]).candidates).toHaveLength(2);
  const ended = buildContext(
    parseSheet(h + ',Game duration\n1,1,25,Tech,11:18,Citadel,Air,12:30\n1,1,10,Air,,,,'),
  );
  expect(coverage(ended, ended.dataset.rows[1]).seconds).toBeNull();
});
