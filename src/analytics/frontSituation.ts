import type { Context, Observation } from '../domain/types';
import { readiness } from './readiness';
import { ROLES } from '../data/normalize';

export const FRONT_SITUATIONS = ['Disadvantage', 'Equal', 'Advantage'] as const;
export type FrontSituation = (typeof FRONT_SITUATIONS)[number];
export function parseFrontSituation(raw: string): FrontSituation | undefined {
  return FRONT_SITUATIONS.find((value) => value.toLowerCase() === raw.trim().toLowerCase());
}
export const EARLY_AN_COMPLETION_SECONDS = 1500;
export const FRONT_SUMMARY_MIN_BUILDERS = 5;
export const FRONT_SUMMARY_MIN_GAMES = 3;
export type FrontPoint = {
  row: Observation;
  front: FrontSituation;
  completion: number;
  seconds: number;
};

export type FrontGroup = {
  role: string;
  front: FrontSituation;
  points: FrontPoint[];
  n: number;
  games: string[];
  median: number;
  q1: number;
  q3: number;
  summaryEligible: boolean;
  deltaEqual: number | null;
};

function quantile(sorted: number[], proportion: number) {
  const index = (sorted.length - 1) * proportion;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

export function analyzeFrontSituation(context: Context, rows: Observation[], observed = false) {
  const points: FrontPoint[] = [];
  const exclusions = {
    nonbuilders: 0,
    unavailableTiming: 0,
    missingFront: 0,
    unrecognizedFront: 0,
    laterBuilds: 0,
    modeledAfterEnd: 0,
  };
  let frontWithoutTiming = 0;
  for (const row of rows) {
    const ready = readiness(row, context.games.get(row.gameId)?.duration ?? null);
    const rawFront = row.raw['Front situation upon AN build'] ?? '';
    if (rawFront.trim() && ready.completion.kind !== 'valid') frontWithoutTiming++;
    if (!ready.interpretable) {
      exclusions.unavailableTiming++;
      continue;
    }
    if (ready.completion.kind !== 'valid') {
      exclusions.nonbuilders++;
      continue;
    }
    if (ready.completion.seconds > EARLY_AN_COMPLETION_SECONDS) {
      exclusions.laterBuilds++;
      continue;
    }
    const front = parseFrontSituation(rawFront);
    if (!front) {
      if (rawFront.trim()) exclusions.unrecognizedFront++;
      else exclusions.missingFront++;
      continue;
    }
    const seconds = observed ? ready.completion.seconds : ready.inGameSeconds;
    if (seconds === null) {
      exclusions.modeledAfterEnd++;
      continue;
    }
    points.push({ row, front, completion: ready.completion.seconds, seconds });
  }
  const roles = [...new Set(points.map((point) => point.row.role))].sort(
    (a, b) =>
      (ROLES.includes(a) ? ROLES.indexOf(a) : ROLES.length) -
        (ROLES.includes(b) ? ROLES.indexOf(b) : ROLES.length) || a.localeCompare(b),
  );
  const groups: FrontGroup[] = roles.flatMap((role) =>
    FRONT_SITUATIONS.flatMap((front) => {
      const group = points.filter((point) => point.row.role === role && point.front === front);
      if (!group.length) return [];
      const times = group.map((point) => point.seconds).sort((a, b) => a - b);
      const games = [...new Set(group.map((point) => point.row.gameId))];
      return [
        {
          role,
          front,
          points: group,
          n: group.length,
          games,
          median: quantile(times, 0.5),
          q1: quantile(times, 0.25),
          q3: quantile(times, 0.75),
          summaryEligible:
            group.length >= FRONT_SUMMARY_MIN_BUILDERS && games.length >= FRONT_SUMMARY_MIN_GAMES,
          deltaEqual: null,
        },
      ];
    }),
  );
  for (const group of groups) {
    const equal = groups.find(
      (candidate) => candidate.role === group.role && candidate.front === 'Equal',
    );
    if (group.front !== 'Equal' && group.summaryEligible && equal?.summaryEligible)
      group.deltaEqual = group.median - equal.median;
  }
  const games = [...new Set(points.map((point) => point.row.gameId))];
  return {
    points,
    groups,
    roles,
    games,
    exclusions,
    frontWithoutTiming,
    partialGames: games.filter((id) => context.games.get(id)?.roster === 'partial').length,
    reviewGames: games.filter((id) => context.games.get(id)?.roster === 'review').length,
    assumedEndpoints: games.filter((id) => context.games.get(id)?.durationSource !== 'recorded')
      .length,
  };
}
