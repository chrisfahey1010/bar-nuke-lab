import type { Context, Observation } from '../domain/types';
import { parseElapsed } from '../domain/time';
import { coverage, type Coverage } from './coverage';
export type OpeningStrike = {
  id: string;
  gameId: string;
  teamId: '1' | '2' | null;
  time: number;
  records: Observation[];
  targetRoles: string[];
  notes: string;
  legacyCounts: string[];
  salvoSize: null;
  kind: 'launch';
  confirmedEarliest: false;
  targets: { row: Observation; coverage: Coverage }[];
};
export function recordedNuclearTime(
  row: Observation,
  field: string,
  duration: number | null,
): number | null {
  const parsed = parseElapsed(row.raw[field] ?? '');
  if (parsed.kind !== 'valid' || (duration !== null && parsed.seconds > duration)) return null;
  const silo = parseElapsed(row.raw['Nuke built'] ?? '');
  const ammo = parseElapsed(row.raw['First Nuke ready'] ?? '');
  if (field === 'First Nuke ready' && silo.kind === 'valid' && parsed.seconds < silo.seconds)
    return null;
  if (
    field === 'First Nuke launch' &&
    ((silo.kind === 'valid' && parsed.seconds < silo.seconds) ||
      (ammo.kind === 'valid' && parsed.seconds < ammo.seconds))
  )
    return null;
  return parsed.seconds;
}
export function openingStrikes(c: Context, gameId: string): OpeningStrike[] {
  const game = c.games.get(gameId);
  if (!game) return [];
  const groups = new Map<string, { row: Observation; time: number }[]>();
  for (const row of game.rows) {
    const launch = recordedNuclearTime(row, 'First Nuke launch', game.duration);
    if (!row.usable || launch === null) continue;
    const key = row.teamId ?? row.ref;
    const group = groups.get(key) ?? [];
    group.push({ row, time: launch });
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, events]) => {
      const time = Math.min(...events.map((e) => e.time));
      const records = events.filter((e) => e.time === time).map((e) => e.row);
      const teamId = records[0].teamId;
      const targetRoles = [...new Set(records.flatMap((r) => r.targetRoles))];
      const targets =
        teamId === null
          ? []
          : game.rows
              .filter(
                (r) => r.teamId !== null && r.teamId !== teamId && targetRoles.includes(r.role),
              )
              .map((row) => ({ row, coverage: coverage(c, row) }));
      return {
        id: gameId + ':' + key,
        gameId,
        teamId,
        time,
        records,
        targetRoles,
        notes: records
          .map((r) => r.raw.Notes ?? '')
          .filter(Boolean)
          .join('\n'),
        legacyCounts: records.map((r) => r.raw['Num nukes launched'] ?? '').filter(Boolean),
        salvoSize: null,
        kind: 'launch' as const,
        confirmedEarliest: false as const,
        targets,
      };
    })
    .sort((a, b) => a.time - b.time);
}
