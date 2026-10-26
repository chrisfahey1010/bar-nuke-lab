import { expect, test } from 'vitest';
import { fitQuadratic } from '../../src/analytics/quadraticFit';

test('least-squares quadratic recovers a curved relationship within the observed time range', () => {
  const curve = (x: number) => 0.5 * (x - 16) ** 2 + 12;
  const fit = fitQuadratic([12, 14, 16, 18, 22].map((x) => ({ x, y: curve(x) })))!;
  expect(fit).not.toBeNull();
  expect(fit.n).toBe(5);
  expect(fit.points.length).toBeGreaterThan(50);
  expect(fit.points[0].x).toBe(12);
  expect(fit.points.at(-1)!.x).toBe(22);
  for (const point of fit.points) expect(point.y).toBeCloseTo(curve(point.x), 9);
  expect(fit.rSquared).toBeCloseTo(1, 9);
});

test('fits a noisy cloud rather than connecting individual observations', () => {
  const noise = [1, -2, 0, 2, -1]; // Orthogonal to 1, time and time².
  const points = [14, 15, 16, 17, 18].map((x, i) => ({ x, y: (x - 16) ** 2 + 10 + noise[i] }));
  const fit = fitQuadratic(points)!;
  for (const point of fit.points) expect(point.y).toBeCloseTo((point.x - 16) ** 2 + 10, 9);
  const mean = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const total = points.reduce((sum, p) => sum + (p.y - mean) ** 2, 0);
  expect(fit.rSquared).toBeCloseTo(1 - 10 / total, 9);
});

test.each(
  [
    [],
    [
      { x: 12, y: 10 },
      { x: 14, y: 20 },
    ],
    [
      { x: 12, y: 10 },
      { x: 12, y: 20 },
      { x: 14, y: 30 },
    ],
    [
      { x: 12, y: 10 },
      { x: NaN, y: 20 },
      { x: 14, y: 30 },
    ],
    [
      { x: 12, y: 10 },
      { x: 13, y: Infinity },
      { x: 14, y: 30 },
    ],
    [
      { x: 0, y: 10 },
      { x: 1e-12, y: 20 },
      { x: 1, y: 30 },
    ],
  ].map((points) => ({ points })),
)('declines insufficient, invalid or numerically singular data: $points', ({ points }) => {
  expect(fitQuadratic(points)).toBeNull();
});

test('retains repeated timings as equally weighted observations, not deduplicated rows', () => {
  const fit = fitQuadratic([
    { x: 12, y: 10 },
    { x: 12, y: 30 },
    { x: 14, y: 12 },
    { x: 16, y: 8 },
  ])!;
  expect(fit.n).toBe(4);
  expect(fit.points[0].y).toBeCloseTo(20, 9);
});

test('constant numeric OS, including zero, remains valid without claiming an R²', () => {
  for (const y of [0, 22]) {
    const fit = fitQuadratic([12, 14, 16, 18].map((x) => ({ x, y })))!;
    expect(fit.rSquared).toBeNull();
    for (const point of fit.points) expect(point.y).toBeCloseTo(y, 9);
  }
});

test('changing timing basis translates the fit without changing the OS relationship', () => {
  const points = [12, 14, 16, 18].map((x) => ({ x, y: (x - 16) ** 2 + 10 }));
  const observed = fitQuadratic(points)!;
  for (const shift of [1.5, 1e9]) {
    const modeled = fitQuadratic(points.map((p) => ({ ...p, x: p.x + shift })))!;
    modeled.points.forEach((p, i) => {
      expect(p.x - shift).toBeCloseTo(observed.points[i].x, 6);
      expect(p.y).toBeCloseTo(observed.points[i].y, 5);
    });
    expect(modeled.rSquared).toBeCloseTo(observed.rSquared!, 9);
  }
});
