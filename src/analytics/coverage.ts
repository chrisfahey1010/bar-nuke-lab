import type { Context, Observation } from '../domain/types';
import { readiness } from './readiness';
export type Coverage = {
  seconds: number | null;
  providers: Observation[];
  candidates: Observation[];
  ambiguous: boolean;
  incomplete: boolean;
  status: 'recorded' | 'none' | 'unknown';
};
export const NO_COVERAGE_LABEL = 'No recorded coverage yet';
export function coverage(c: Context, target: Observation): Coverage {
  const game = c.games.get(target.gameId);
  const duration = game?.duration ?? null;
  const providers = (game?.rows ?? [])
    .filter(
      (p) =>
        (p.ref === target.ref ||
          (target.teamId !== null &&
            p.teamId === target.teamId &&
            (p.role === target.role || p.coveredRoles.includes(target.role)))) &&
        readiness(p, duration).interpretable &&
        readiness(p, duration).inGameSeconds !== null,
    )
    .sort((a, b) => readiness(a, duration).inGameSeconds! - readiness(b, duration).inGameSeconds!);
  const candidates = (game?.rows ?? []).filter(
    (r) =>
      r.usable &&
      r.role === target.role &&
      (r.ref === target.ref || (target.teamId !== null && r.teamId === target.teamId)),
  );
  return {
    seconds: providers.length ? readiness(providers[0], duration).inGameSeconds : null,
    providers,
    candidates,
    ambiguous: candidates.length > 1,
    incomplete: game?.roster !== 'full' || game?.grouping !== 'complete',
    status: providers.length ? 'recorded' : target.teamId === null ? 'unknown' : 'none',
  };
}
