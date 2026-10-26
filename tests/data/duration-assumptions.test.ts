import { expect, test } from 'vitest';
import { buildContext } from '../../src/data/gameMetadata';
import { parseSheet } from '../../src/data/sheetAdapter';
import { ongoingSummary } from '../../src/analytics/summary';
import { selectRows, DEFAULT_FILTERS } from '../../src/analytics/selectors';
import { csvOf, fullRows } from '../fixtures/helpers';
import { parseElapsed } from '../../src/domain/time';

test('unknown duration uses a labeled 30-minute endpoint without altering the source', () => {
  const c = buildContext(parseSheet(csvOf(fullRows('unknown', ''))));
  const g = c.games.get('unknown')!;
  expect(g.duration).toBe(1800);
  expect(g.recordedDuration).toBeNull();
  expect(g.durationSource).toBe('placeholder');
  expect(g.durationNote).toContain('30:00');
  expect(g.durationTokens).toEqual([]);
  expect(g.rows.every((r) => r.raw['Game duration'] === '')).toBe(true);
  const tech = selectRows(c, { ...DEFAULT_FILTERS, role: 'Tech' });
  const s = ongoingSummary(c, tech, 900);
  expect(s.own).toEqual({ numerator: 2, n: 2, percentage: 100 });
  expect(s.coverage).toEqual({ numerator: 2, n: 2, percentage: 100 });
  expect(s.placeholderGames).toBe(1);
  expect(ongoingSummary(c, tech, 1800).games).toBe(0);
});

test('confirmed Game 7 formatting error becomes 29:03 only for the exact source token', () => {
  const c = buildContext(
    parseSheet(csvOf([...fullRows('7', '29:03:00'), ...fullRows('other', '29:03:00')])),
  );
  const g = c.games.get('7')!;
  expect(g.duration).toBe(1743);
  expect(g.recordedDuration).toBe(104580);
  expect(g.durationSource).toBe('corrected');
  expect(g.durationNote).toContain('29:03');
  expect(g.durationTokens).toEqual(['29:03:00']);
  expect(g.rows[0].raw['Game duration']).toBe('29:03:00');
  expect(g.issues.some((i) => i.message.includes('Unusually long'))).toBe(false);
  const tech = selectRows(c, { ...DEFAULT_FILTERS, role: 'Tech', game: '7' });
  expect(ongoingSummary(c, tech, 1742).correctedGames).toBe(1);
  expect(ongoingSummary(c, tech, 1743).games).toBe(0);
  expect(c.games.get('other')!.duration).toBe(104580);
  expect(c.games.get('other')!.durationSource).toBe('recorded');
  expect(parseElapsed('29:03:00')).toEqual({ kind: 'valid', seconds: 104580, raw: '29:03:00' });
  const updated = buildContext(parseSheet(csvOf(fullRows('7', '31:00')))).games.get('7')!;
  expect(updated.duration).toBe(1860);
  expect(updated.durationSource).toBe('recorded');
});
