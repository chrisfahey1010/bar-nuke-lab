import Papa from 'papaparse';
import { HEADERS, REQUIRED_HEADERS, rawRowSchema } from './schema';
import { normalizeRole, normalizeType, roleList } from './normalize';
import type { Dataset, Issue, Observation } from '../domain/types';
export function parseSheet(csv: string): Dataset {
  const result = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  if (result.errors.length) throw new Error('Malformed CSV: ' + result.errors[0].message);
  const headers = result.data[0] ?? [];
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) throw new Error('Missing required headers: ' + missing.join(', '));
  if (new Set(headers).size !== headers.length || headers.some((h) => !h))
    throw new Error('Empty or duplicate source headers');
  const rows: Observation[] = [];
  for (let i = 1; i < result.data.length; i++) {
    const cells = result.data[i];
    if (cells.every((c) => c.trim() === '')) continue;
    const raw = rawRowSchema.parse(Object.fromEntries(headers.map((h, j) => [h, cells[j] ?? ''])));
    let column = '';
    for (let n = headers.length; n > 0; n = Math.floor((n - 1) / 26))
      column = String.fromCharCode(65 + ((n - 1) % 26)) + column;
    const ref = `Sheet1!A${i + 1}:${column}${i + 1}`;
    const issues: Issue[] = [];
    const add = (field: string, message: string) => issues.push({ field, message, rowRef: ref });
    if (cells.length > headers.length) {
      cells.slice(headers.length).forEach((value, index) => {
        let key = `_extra_${index + 1}`;
        while (Object.hasOwn(raw, key)) key = 'retained_' + key;
        raw[key] = value;
      });
      add('CSV', 'Unexpected extra cells retained');
    }
    const gameId = raw['Game ID'];
    const role = normalizeRole(raw.Position);
    if (!gameId.trim()) add('Game ID', 'Missing game identifier');
    else if (gameId !== gameId.trim())
      add('Game ID', 'Whitespace in literal game identifier; review, not repaired');
    if (!role.trim()) add('Position', 'Missing role');
    const osToken = raw.OS;
    const os =
      /^(?:-1|\d+(?:\.\d+)?)$/.test(osToken) && Number.isFinite(Number(osToken))
        ? Number(osToken)
        : null;
    if (os === null) add('OS', 'Invalid or missing numeric OS');
    const teamToken = raw['Team ID'] ?? '';
    const teamId = teamToken === '1' || teamToken === '2' ? teamToken : null;
    if (teamId === null)
      add(
        'Team ID',
        teamToken === '' ? 'Unknown team' : 'Invalid Team ID; expected literal 1 or 2',
      );
    rows.push({
      ref,
      sourceRow: i + 1,
      raw,
      gameId,
      teamId,
      os,
      unranked: os === -1,
      role,
      anType: normalizeType(raw['AN Type'] ?? ''),
      coveredRoles: roleList(raw['Other positions covered'] ?? ''),
      targetRoles: roleList(raw['Positions targeted'] ?? ''),
      usable: !!gameId.trim() && !!role.trim() && cells.length <= headers.length,
      issues,
    });
  }
  if (!rows.some((r) => r.usable)) throw new Error('No usable player observations');
  return {
    headers,
    rows,
    missingOptional: HEADERS.filter((h) => !REQUIRED_HEADERS.includes(h) && !headers.includes(h)),
    issues: rows.flatMap((r) => r.issues),
  };
}
