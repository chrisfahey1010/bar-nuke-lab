import { expect, test } from 'vitest';
test('the unit harness executes actual assertions', () => {
  expect([1, 2].reduce((a, b) => a + b)).toBe(3);
});
