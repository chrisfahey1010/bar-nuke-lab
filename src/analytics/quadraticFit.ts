export type FitPoint = { x: number; y: number };
export type QuadraticFit = { points: FitPoint[]; n: number; rSquared: number | null };

/** Fit OS = a + b*time + c*time². Sample only the observed time span, never extrapolate. */
export function fitQuadratic(points: FitPoint[]): QuadraticFit | null {
  if (points.length < 3 || points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return null;
  const xs = points.map((p) => p.x);
  const min = Math.min(...xs),
    max = Math.max(...xs);
  if (new Set(xs).size < 3) return null;
  const center = min + (max - min) / 2;
  const scale = (max - min) / 2;
  const z = xs.map((x) => (x - center) / scale);
  const columns = [z.map(() => 1), z, z.map((x) => x * x)];
  const dot = (a: number[], b: number[]) => a.reduce((sum, value, i) => sum + value * b[i], 0);
  const q: number[][] = [];
  const r = Array.from({ length: 3 }, () => [0, 0, 0]);
  // Center/scale time and use reorthogonalized QR, not unstable raw-time normal equations.
  for (let j = 0; j < 3; j++) {
    let v = [...columns[j]];
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < j; i++) {
        const projection = dot(q[i], v);
        r[i][j] += projection;
        v = v.map((value, k) => value - projection * q[i][k]);
      }
    r[j][j] = Math.sqrt(dot(v, v));
    if (r[j][j] < 1e-10 * Math.sqrt(points.length)) return null;
    q.push(v.map((value) => value / r[j][j]));
  }
  const y = points.map((p) => p.y);
  const coefficients = q.map((column) => dot(column, y));
  for (let j = 2; j >= 0; j--) {
    for (let k = j + 1; k < 3; k++) coefficients[j] -= r[j][k] * coefficients[k];
    coefficients[j] /= r[j][j];
  }
  const predict = (x: number) => {
    const t = (x - center) / scale;
    return coefficients[0] + t * (coefficients[1] + t * coefficients[2]);
  };
  const mean = y.reduce((sum, value) => sum + value, 0) / y.length;
  const total = y.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const residual = points.reduce((sum, p) => sum + (p.y - predict(p.x)) ** 2, 0);
  const samples = Array.from({ length: 81 }, (_, i) => {
    const x = min + ((max - min) * i) / 80;
    return { x, y: predict(x) };
  });
  if (samples.some((p) => !Number.isFinite(p.y))) return null;
  return {
    points: samples,
    n: points.length,
    rSquared: total > 1e-12 ? Math.max(0, Math.min(1, 1 - residual / total)) : null,
  };
}
