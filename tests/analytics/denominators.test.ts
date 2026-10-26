import { expect, test } from 'vitest';
import { buildContext } from '../../src/data/gameMetadata';
import { parseSheet } from '../../src/data/sheetAdapter';
import { selectRows, DEFAULT_FILTERS } from '../../src/analytics/selectors';
import { ongoingSummary } from '../../src/analytics/summary';
import { csvOf, fullRows } from '../fixtures/helpers';
test('uses ongoing full-game roster slots, target filters, inclusive readiness and strict game termination', () => {
  const c = buildContext(
    parseSheet(
      csvOf([
        ...fullRows('full'),
        ...fullRows('unknown', ''),
        ...fullRows('ended', '12:48'),
        ...fullRows('partial').slice(0, 3),
      ]),
    ),
  );
  const targets = selectRows(c, { ...DEFAULT_FILTERS, role: 'Air' });
  const s = ongoingSummary(c, targets, 768);
  expect(s.own).toEqual({ numerator: 0, n: 4, percentage: 0 });
  expect(s.coverage).toEqual({ numerator: 4, n: 4, percentage: 100 });
  expect(s.games).toBe(2);
  expect(s.placeholderGames).toBe(1);
  expect(s.excludedGames).toBe(2);
  expect(s.excludedRows).toBe(3);
  expect(c.games.get('full')?.roster).toBe('full');
  const tech = ongoingSummary(c, selectRows(c, { ...DEFAULT_FILTERS, role: 'Tech' }), 768);
  expect(tech.own.numerator).toBe(4);
  expect(ongoingSummary(c, targets, 767).coverage.numerator).toBe(0);
  expect(ongoingSummary(c, targets, 1800).own.percentage).toBeNull();
  expect(ongoingSummary(c, targets, 768, true).own.n).toBe(5);
});
