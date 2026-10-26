import type { Context, Observation } from '../domain/types';
import { readiness } from './readiness';
import { coverage } from './coverage';
export type Rate = { numerator: number; n: number; percentage: number | null };
const rate = (numerator: number, n: number): Rate => ({
  numerator,
  n,
  percentage: n > 0 ? (numerator / n) * 100 : null,
});
export function ongoingSummary(c: Context, rows: Observation[], t: number, partial = false) {
  const chosenGames = new Set(rows.map((r) => r.gameId));
  const eligibleGames = new Set(
    [...c.games.values()]
      .filter(
        (g) =>
          chosenGames.has(g.id) &&
          (g.roster === 'full' || (partial && g.roster === 'partial')) &&
          g.duration !== null &&
          g.duration > t,
      )
      .map((g) => g.id),
  );
  const eligible = rows.filter((r) => eligibleGames.has(r.gameId));
  let ownN = 0,
    ownOnline = 0,
    coverageN = 0,
    covered = 0,
    unknownOwn = 0,
    unknownCoverage = 0;
  for (const r of eligible) {
    const ready = readiness(r, c.games.get(r.gameId)!.duration);
    if (!ready.interpretable) {
      unknownOwn++;
      unknownCoverage++;
      continue;
    }
    ownN++;
    if (ready.inGameSeconds !== null && ready.inGameSeconds <= t) ownOnline++;
    const cov = coverage(c, r);
    if (cov.status === 'unknown') {
      unknownCoverage++;
      continue;
    }
    coverageN++;
    if (cov.seconds !== null && cov.seconds <= t) covered++;
  }
  return {
    own: rate(ownOnline, ownN),
    coverage: rate(covered, coverageN),
    games: eligibleGames.size,
    placeholderGames: [...eligibleGames].filter(
      (id) => c.games.get(id)!.durationSource === 'placeholder',
    ).length,
    correctedGames: [...eligibleGames].filter(
      (id) => c.games.get(id)!.durationSource === 'corrected',
    ).length,
    excludedGames: chosenGames.size - eligibleGames.size,
    excludedRows: rows.length - eligible.length,
    unknownOwn,
    unknownCoverage,
    eligibleRows: eligible.length,
    cohort: partial
      ? 'Selected observed-player sample (partial rosters included)'
      : 'Recorded roster slots in ongoing inferred-full games',
  };
}

export function ongoingReadinessSeries(
  c: Context,
  rows: Observation[],
  start: number,
  end: number,
  partial = false,
) {
  // Match the one-second clock exactly, including endpoint exclusions and null N=0 gaps.
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const seconds = start + index;
    return { seconds, ...ongoingSummary(c, rows, seconds, partial) };
  });
}
