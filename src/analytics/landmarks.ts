import type { Context, Observation } from '../domain/types';
import { readiness } from './readiness';
export type Milestone = { row: Observation; seconds: number };
export function milestones(c: Context, rows: Observation[], observed = false): Milestone[] {
  return rows
    .flatMap((row) => {
      const ready = readiness(row, c.games.get(row.gameId)?.duration ?? null);
      const seconds =
        observed && ready.completion.kind === 'valid'
          ? ready.completion.seconds
          : ready.inGameSeconds;
      return ready.interpretable && seconds !== null ? [{ row, seconds }] : [];
    })
    .sort((a, b) => a.seconds - b.seconds);
}
export function roleLandmarks(c: Context, rows: Observation[], observed = false) {
  const points = milestones(c, rows, observed);
  return [...new Set(rows.map((r) => r.role))].sort().map((role) => {
    const values = points.filter((p) => p.row.role === role);
    const times = values.map((v) => v.seconds);
    const n = times.length;
    const median = n ? (times[Math.floor((n - 1) / 2)] + times[Math.floor(n / 2)]) / 2 : null;
    return {
      role,
      n,
      games: new Set(values.map((v) => v.row.gameId)).size,
      median,
      unavailable: rows.filter((r) => r.role === role).length - n,
    };
  });
}
