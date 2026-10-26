import type { Game } from '../domain/types';
import { ROLES } from '../data/normalize';
export function reviewRoster(g: Game): void {
  const count = g.usableCount;
  let suspicious = false;
  const warn = (message: string) => {
    g.issues.push({ field: 'Roster', message });
    suspicious = true;
  };
  if (count !== 16)
    g.issues.push({
      field: 'Roster',
      message: `${count} usable player rows; ${count < 16 ? 'partial' : 'unexpected overcount'} for the 16-slot scope`,
    });
  const fingerprints = g.rows.map((r) => JSON.stringify(r.raw));
  if (new Set(fingerprints).size < fingerprints.length)
    warn('Duplicate-looking source rows retained; inspect source references');
  for (const team of ['1', '2'] as const) {
    const members = g.rows.filter((r) => r.usable && r.teamId === team);
    for (const role of new Set(members.map((r) => r.role)))
      if (members.filter((r) => r.role === role).length > 1)
        warn(`Repeated role ${role} on Team ${team}; target identity may be ambiguous`);
    if (members.length > 8) warn(`Team ${team} has ${members.length} rows; unexpected split`);
  }
  for (const role of new Set(g.rows.filter((r) => r.usable).map((r) => r.role)))
    if (g.rows.filter((r) => r.usable && r.role === role).length > 2)
      warn(`Repeated role ${role} exceeds two expected match slots, including unknown teams`);
  if (g.rows.some((r) => r.usable && !ROLES.includes(r.role)))
    warn('Unexpected role outside the current 8v8 allowlist');
  if (g.rows.some((r) => r.raw['Team ID'] && r.teamId === null)) {
    warn('Contradictory Team ID values');
    g.grouping = 'review';
  }
  if (count > 16 || (count === 16 && suspicious)) g.roster = 'review';
}
