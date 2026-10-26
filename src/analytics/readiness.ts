import type { Observation } from '../domain/types';
import { parseElapsed } from '../domain/time';
import { AN_AMMO_DELAY_SECONDS } from '../domain/modelConfig';
export function readiness(row: Observation, duration: number | null = null) {
  const completion = parseElapsed(row.raw['AN built time'] ?? '');
  const modeledSeconds =
    completion.kind === 'valid' ? completion.seconds + AN_AMMO_DELAY_SECONDS : null;
  const outsideMatch = modeledSeconds !== null && duration !== null && modeledSeconds > duration;
  const contradiction =
    (completion.kind === 'blank' && row.anType !== '') ||
    (completion.kind === 'valid' && duration !== null && completion.seconds > duration);
  return {
    completion,
    modeledSeconds,
    inGameSeconds: outsideMatch ? null : modeledSeconds,
    interpretable: row.usable && completion.kind !== 'invalid' && !contradiction,
    outsideMatch,
  };
}
