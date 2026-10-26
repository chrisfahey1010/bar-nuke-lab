import type { Context, Filters, Observation } from '../domain/types';
import { parseFrontSituation } from './frontSituation';
export const DEFAULT_FILTERS: Filters = {
  role: '',
  osMin: null,
  osMax: null,
  includeUnranked: true,
  front: '',
  anType: '',
  game: '',
  roster: '',
  search: '',
};
export function selectRows(c: Context, f: Filters): Observation[] {
  return c.dataset.rows.filter((r) => {
    if (
      (f.role && r.role !== f.role) ||
      (f.game && r.gameId !== f.game) ||
      (f.roster && c.games.get(r.gameId)?.roster !== f.roster)
    )
      return false;
    if (f.anType && (f.anType === '$missing' ? r.anType !== '' : r.anType !== f.anType))
      return false;
    if (f.front && parseFrontSituation(r.raw['Front situation upon AN build'] ?? '') !== f.front)
      return false;
    if (r.unranked) {
      if (!f.includeUnranked) return false;
    } else if (f.osMin !== null || f.osMax !== null) {
      if (
        r.os === null ||
        (f.osMin !== null && r.os < f.osMin) ||
        (f.osMax !== null && r.os > f.osMax)
      )
        return false;
    }
    return (
      !f.search || Object.values(r.raw).join(' ').toLowerCase().includes(f.search.toLowerCase())
    );
  });
}
