import { expect, test } from 'vitest';
import Papa from 'papaparse';
import { makeSnapshot } from '../../src/data/snapshot';
import { parseSheet } from '../../src/data/sheetAdapter';
import { buildContext } from '../../src/data/gameMetadata';
import { exportRecords, exportCsv, exportJson } from '../../src/data/export';
test('exports exact raw notes plus clearly named model, coverage and retrieval provenance', () => {
  const csv =
    'Game ID,Team ID,OS,Position,AN built time,AN Type,Other positions covered,Notes\n001,1,30,Tech,11:18,Umbrella,Air,"literal, note"\n001,1,10,Air,,,,';
  const s = makeSnapshot(csv, 'imported', 'test-only.csv');
  const c = buildContext(parseSheet(csv));
  const out = exportRecords(c, [c.dataset.rows[1]], s);
  expect(out).toHaveLength(1);
  expect(out[0]['Game ID']).toBe('001');
  expect(out[0].derived_modeled_ready_seconds).toBe('');
  expect(out[0].derived_coverage_ready_seconds).toBe('768');
  expect(out[0].derived_coverage_provider_refs).toBe('Sheet1!A2:H2');
  expect(out[0].derived_source_kind).toBe('imported');
  expect(out[0].derived_model_delay_seconds).toBe('90');
  const full = exportRecords(c, c.dataset.rows, s);
  expect(full[0].Notes).toBe('literal, note');
  expect(Papa.parse(exportCsv(out), { header: true }).data).toHaveLength(1);
  const json = JSON.parse(exportJson(c, c.dataset.rows, s));
  expect(json.records[0].raw.Notes).toBe('literal, note');
  expect(makeSnapshot(JSON.stringify(json), 'imported', 'roundtrip.json').csv).toBe(csv);
});
test('exports effective endpoint assumptions separately from exact raw duration evidence', () => {
  const csv =
    'Game ID,OS,Position,AN built time,Game duration\n7,20,Tech,13:38,29:03:00\n1,20,Tech,11:18,';
  const c = buildContext(parseSheet(csv));
  const s = makeSnapshot(csv, 'imported', 'duration-test.csv');
  const records = exportRecords(c, c.dataset.rows, s);
  expect(records[0]['Game duration']).toBe('29:03:00');
  expect(records[0].derived_game_duration_seconds).toBe('1743');
  expect(records[0].derived_duration_source).toBe('corrected');
  expect(records[0].derived_recorded_duration_seconds).toBe('104580');
  expect(records[0].derived_duration_note).toContain('User-confirmed');
  expect(records[1]['Game duration']).toBe('');
  expect(records[1].derived_game_duration_seconds).toBe('1800');
  expect(records[1].derived_duration_source).toBe('placeholder');
  expect(records[1].derived_recorded_duration_seconds).toBe('');
  const json = JSON.parse(exportJson(c, c.dataset.rows, s));
  expect(json.records[0].derived.derived_duration_source).toBe('corrected');
  expect(json.records[1].derived.derived_duration_source).toBe('placeholder');
  expect(json.csv).toBe(csv);
});
test('CSV export includes retained extra cells present only on later rows', () => {
  const csv = 'Game ID,OS,Position,AN built time\n1,20,Tech,11:18\n1,10,Air,,literal extra';
  const context = buildContext(parseSheet(csv));
  const snapshot = makeSnapshot(csv, 'imported', 'test-only.csv');
  const records = Papa.parse<Record<string, string>>(
    exportCsv(exportRecords(context, context.dataset.rows, snapshot)),
    { header: true },
  ).data;
  expect(records[1]._extra_1).toBe('literal extra');
});
test('filtered JSON re-import retains extra cells and their invalid-row provenance', () => {
  const csv =
    'Game ID,OS,Position,AN built time\n1,30,Geo,12:00\n1,20,Tech,11:18\n1,10,Air,,literal extra';
  const context = buildContext(parseSheet(csv));
  const snapshot = makeSnapshot(csv, 'imported', 'test-only.csv');
  const exported = exportJson(context, context.dataset.rows.slice(1), snapshot);
  const imported = parseSheet(makeSnapshot(exported, 'imported', 'roundtrip.json').csv);
  expect(imported.rows[1].raw._extra_1).toBe('literal extra');
  expect(imported.rows[1].usable).toBe(false);
});
test('source headers cannot collide with generated model fields in CSV or JSON', () => {
  const csv =
    'Game ID,OS,Position,AN built time,derived_model_delay_seconds,lab_derived_model_delay_seconds\n1,20,Tech,11:18,LITERAL SOURCE VALUE,SECOND LITERAL';
  const context = buildContext(parseSheet(csv));
  const snapshot = makeSnapshot(csv, 'imported', 'test-only.csv');
  const records = exportRecords(context, context.dataset.rows, snapshot);
  expect(records[0].derived_model_delay_seconds).toBe('LITERAL SOURCE VALUE');
  expect(records[0].lab_derived_model_delay_seconds).toBe('SECOND LITERAL');
  expect(records[0].lab_lab_derived_model_delay_seconds).toBe('90');
  const json = JSON.parse(exportJson(context, context.dataset.rows, snapshot));
  expect(json.records[0].raw.derived_model_delay_seconds).toBe('LITERAL SOURCE VALUE');
  expect(json.records[0].derived.derived_model_delay_seconds).toBe('90');
  expect(json.records[0].derived.lab_derived_model_delay_seconds).toBeUndefined();
});
