import type { Context, Issue } from '../domain/types';
import { parseElapsed } from '../domain/time';
import { ROLES, AN_TYPES } from './normalize';
export function validationIssues(c: Context): Issue[] {
  const out = [...c.dataset.issues];
  for (const g of c.games.values())
    for (const issue of g.issues) out.push({ ...issue, message: `Game ${g.id}: ${issue.message}` });
  for (const row of c.dataset.rows) {
    const add = (field: string, message: string) => out.push({ field, message, rowRef: row.ref });
    const duration = c.games.get(row.gameId)?.duration ?? null;
    for (const field of [
      'AN built time',
      'Game duration',
      'Nuke built',
      'First Nuke ready',
      'First Nuke launch',
    ]) {
      const t = parseElapsed(row.raw[field] ?? '');
      if (t.kind === 'invalid') add(field, 'Invalid elapsed time: ' + t.raw);
      if (
        t.kind === 'valid' &&
        field !== 'Game duration' &&
        duration !== null &&
        t.seconds > duration
      )
        add(
          field,
          `Observed timestamp is after effective game end (${c.games.get(row.gameId)!.durationSource} endpoint)`,
        );
    }
    if (row.anType && row.raw['AN built time'] === '')
      add('AN built time', 'AN type without completion: unknown, not a confirmed nonbuilder');
    if (!ROLES.includes(row.role))
      add('Position', 'Role outside supported display mapping; literal retained');
    if (row.anType && !AN_TYPES.includes(row.anType))
      add('AN Type', 'Unknown AN category; 90-second model still applies');
    for (const role of [...row.coveredRoles, ...row.targetRoles])
      if (!ROLES.includes(role)) add('Role reference', 'Unrecognized role reference: ' + role);
    const silo = parseElapsed(row.raw['Nuke built'] ?? '');
    const ammo = parseElapsed(row.raw['First Nuke ready'] ?? '');
    const launch = parseElapsed(row.raw['First Nuke launch'] ?? '');
    if (silo.kind === 'valid' && ammo.kind === 'valid' && ammo.seconds < silo.seconds)
      add('First Nuke ready', 'First nuclear ammo is before silo completion');
    if (launch.kind === 'valid' && silo.kind === 'valid' && launch.seconds < silo.seconds)
      add('First Nuke launch', 'First launch is before silo completion');
    if (launch.kind === 'valid' && ammo.kind === 'valid' && launch.seconds < ammo.seconds)
      add('First Nuke launch', 'First launch is before recorded nuclear ammo');
  }
  return out;
}
