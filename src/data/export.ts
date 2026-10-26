import Papa from 'papaparse';
import type { Context, Observation, Snapshot, RawRow } from '../domain/types';
import { readiness } from '../analytics/readiness';
import { coverage } from '../analytics/coverage';
import { AN_AMMO_DELAY_SECONDS } from '../domain/modelConfig';
const token = (n: number | null) => (n === null ? '' : String(n));
function derivedFields(c: Context, row: Observation, snapshot: Snapshot): RawRow {
  const game = c.games.get(row.gameId);
  const ready = readiness(row, game?.duration ?? null);
  const cov = coverage(c, row);
  return {
    derived_observed_completion_seconds:
      ready.completion.kind === 'valid' ? String(ready.completion.seconds) : '',
    derived_completion_status: ready.interpretable ? ready.completion.kind : 'unknown',
    derived_modeled_ready_seconds: token(ready.modeledSeconds),
    derived_in_game_ready_seconds: token(ready.inGameSeconds),
    derived_outside_match: String(ready.outsideMatch),
    derived_model_delay_seconds: String(AN_AMMO_DELAY_SECONDS),
    derived_coverage_ready_seconds: token(cov.seconds),
    derived_coverage_provider_refs: cov.providers.map((p) => p.ref).join('; '),
    derived_coverage_ambiguous: String(cov.ambiguous),
    derived_inferred_roster_status: game?.roster ?? 'unknown',
    derived_team_grouping_status: game?.grouping ?? 'unknown',
    derived_duration_available: String(game?.duration != null),
    derived_game_duration_seconds: token(game?.duration ?? null),
    derived_recorded_duration_seconds: token(game?.recordedDuration ?? null),
    derived_duration_source: game?.durationSource ?? 'unknown',
    derived_duration_note: game?.durationNote ?? '',
    derived_replay_reference: game?.replay ?? '',
    derived_source_ref: row.ref,
    derived_source_kind: snapshot.source,
    derived_source_label: snapshot.label,
    derived_retrieved_at: snapshot.acquiredAt,
  };
}
export function exportRecords(c: Context, rows: Observation[], snapshot: Snapshot): RawRow[] {
  const occupied = new Set(c.dataset.rows.flatMap((row) => Object.keys(row.raw)));
  const derived = rows.map((row) => derivedFields(c, row, snapshot));
  const fieldNames = new Map<string, string>();
  for (const key of new Set(derived.flatMap((record) => Object.keys(record)))) {
    let name = key;
    while (occupied.has(name)) name = 'lab_' + name;
    occupied.add(name);
    fieldNames.set(key, name);
  }
  return rows.map((row, i) => ({
    ...row.raw,
    ...Object.fromEntries(
      Object.entries(derived[i]).map(([key, value]) => [fieldNames.get(key)!, value]),
    ),
  }));
}
export function exportCsv(records: RawRow[]): string {
  const fields = [...new Set(records.flatMap((record) => Object.keys(record)))];
  return Papa.unparse({
    fields,
    data: records.map((record) => fields.map((field) => record[field] ?? '')),
  });
}
export function exportJson(c: Context, rows: Observation[], snapshot: Snapshot): string {
  const full =
    rows.length === c.dataset.rows.length && rows.every((r, i) => r === c.dataset.rows[i]);
  const csv = full
    ? snapshot.csv
    : Papa.unparse([
        c.dataset.headers,
        ...rows.map((row) => [
          ...c.dataset.headers.map((header) => row.raw[header] ?? ''),
          ...Object.keys(row.raw)
            .filter((key) => !c.dataset.headers.includes(key))
            .map((key) => row.raw[key]),
        ]),
      ]);
  const derived = rows.map((row) => derivedFields(c, row, snapshot));
  return JSON.stringify(
    {
      ...snapshot,
      csv,
      selectionScope: full ? 'full' : 'filtered',
      modelDelaySeconds: AN_AMMO_DELAY_SECONDS,
      records: rows.map((r, i) => ({
        raw: r.raw,
        derived: derived[i],
      })),
    },
    null,
    2,
  );
}
