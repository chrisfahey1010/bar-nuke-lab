import Papa from 'papaparse';
import { HEADERS } from '../../src/data/schema';
import { ROLES } from '../../src/data/normalize';
import type { RawRow } from '../../src/domain/types';
export const csvOf = (rows: RawRow[]) =>
  Papa.unparse({ fields: [...HEADERS], data: rows.map((r) => HEADERS.map((h) => r[h] ?? '')) });
export function fullRows(id = 'test', duration = '30:00'): RawRow[] {
  return ['1', '2'].flatMap((team) =>
    ROLES.map((role, i) => ({
      'Game ID': id,
      'Team ID': team,
      OS: String(i * 5),
      Position: role,
      'AN built time': role === 'Tech' ? '11:18' : '',
      'AN Type': role === 'Tech' ? 'Citadel' : '',
      'Other positions covered': role === 'Tech' ? 'Air' : '',
      'Game duration': team === '1' && i === 0 ? duration : '',
    })),
  );
}
