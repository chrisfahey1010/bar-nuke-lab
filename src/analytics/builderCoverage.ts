import type { Context, Observation } from '../domain/types';
import { ROLES } from '../data/normalize';
import { readiness } from './readiness';

export type CoverageBuilder = { row: Observation; additionalRoles: string[]; completion: number };
export type CoverageBand = {
  label: string;
  lower: number | null;
  n: number;
  games: string[];
  counts: [number, number, number];
  percentages: [number, number, number];
  builders: CoverageBuilder[];
};

/** Recorded placement claims among own builders, not target coverage or map geometry. */
export function analyzeBuilderCoverage(context: Context, rows: Observation[]) {
  const builders: CoverageBuilder[] = [];
  const exclusions = {
    nonbuilders: 0,
    unavailableTiming: 0,
    unsupportedPosition: 0,
    missingOs: 0,
    missingCoverageField: 0,
    unknownCoverage: 0,
  };
  let blankCoverage = 0;
  for (const row of rows) {
    const own = readiness(row, context.games.get(row.gameId)?.duration ?? null);
    if (own.completion.kind === 'blank' && own.interpretable) {
      exclusions.nonbuilders++;
      continue;
    }
    if (!own.interpretable || own.completion.kind !== 'valid') {
      exclusions.unavailableTiming++;
      continue;
    }
    if (!ROLES.includes(row.role)) {
      exclusions.unsupportedPosition++;
      continue;
    }
    if (row.os === null) {
      exclusions.missingOs++;
      continue;
    }
    if (!context.dataset.headers.includes('Other positions covered')) {
      exclusions.missingCoverageField++;
      continue;
    }
    const tokens = row.coveredRoles.filter((role) => role.trim() !== '');
    if (tokens.some((role) => !ROLES.includes(role))) {
      exclusions.unknownCoverage++;
      continue;
    }
    if ((row.raw['Other positions covered'] ?? '').trim() === '') blankCoverage++;
    builders.push({
      row,
      completion: own.completion.seconds,
      additionalRoles: [...new Set(tokens)].filter((role) => role !== row.role),
    });
  }
  const grouped = new Map<number | null, CoverageBuilder[]>();
  for (const point of builders) {
    const lower = point.row.unranked ? null : Math.floor(point.row.os! / 10) * 10;
    grouped.set(lower, [...(grouped.get(lower) ?? []), point]);
  }
  const bands: CoverageBand[] = [...grouped.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a - b))
    .map(([lower, points]) => {
      const counts: [number, number, number] = [0, 0, 0];
      for (const point of points) counts[Math.min(2, point.additionalRoles.length)]++;
      return {
        label: lower === null ? 'Unranked' : `${lower}–<${lower + 10}`,
        lower,
        n: points.length,
        games: [...new Set(points.map((point) => point.row.gameId))].sort(),
        counts,
        percentages: counts.map((n) => (n * 100) / points.length) as [number, number, number],
        builders: points,
      };
    });
  const games = [...new Set(builders.map((point) => point.row.gameId))].sort();
  return {
    builders,
    bands,
    games,
    exclusions,
    blankCoverage,
    partialGames: games.filter((id) => context.games.get(id)?.roster === 'partial').length,
    reviewGames: games.filter((id) => context.games.get(id)?.roster === 'review').length,
    assumedEndpoints: games.filter((id) => context.games.get(id)?.durationSource !== 'recorded')
      .length,
  };
}
