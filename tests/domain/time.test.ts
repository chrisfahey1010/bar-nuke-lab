import { expect, test } from 'vitest';
import { parseElapsed, formatTime } from '../../src/domain/time';
test('parses exact elapsed minutes/hours without repairing tokens', () => {
  expect(parseElapsed('11:18')).toEqual({ kind: 'valid', seconds: 678, raw: '11:18' });
  expect(parseElapsed('1:02:03')).toEqual({ kind: 'valid', seconds: 3723, raw: '1:02:03' });
  expect(parseElapsed('29:03:00')).toMatchObject({ seconds: 104580 });
  expect(formatTime(768)).toBe('12:48');
  expect(formatTime(null)).toBe('—');
});
test('distinguishes blank from invalid elapsed tokens', () => {
  expect(parseElapsed('')).toEqual({ kind: 'blank', raw: '' });
  for (const token of [
    '11:60',
    '1:60:00',
    '11:1',
    '11:18 ',
    ' 11:18',
    '?',
    '-1:00',
    '11:18 AM',
    '0.5',
  ])
    expect(parseElapsed(token).kind).toBe('invalid');
  expect(parseElapsed('0:00')).toMatchObject({ kind: 'valid', seconds: 0 });
});
