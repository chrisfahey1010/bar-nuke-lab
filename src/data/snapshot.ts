import { z } from 'zod';
import { parseSheet } from './sheetAdapter';
import type { Snapshot } from '../domain/types';
export const SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/1KOvDzr5li30oBIp_yWNXyauAgZ9Tav4N7tJchd4CK_c/export?format=csv&gid=0';
const envelope = z.object({ version: z.literal(1), csv: z.string(), acquiredAt: z.string() });
export function makeSnapshot(text: string, source: 'google' | 'imported', label: string): Snapshot {
  if (/^\s*(?:<!doctype|<html|<head|<body)/i.test(text))
    throw new Error('HTML/login response; expected CSV');
  let csv = text;
  if (source === 'imported' && text.trimStart().startsWith('{'))
    csv = envelope.parse(JSON.parse(text)).csv;
  parseSheet(csv);
  return {
    version: 1,
    csv,
    acquiredAt: new Date().toISOString(),
    source,
    sourceUrl: source === 'google' ? SOURCE_URL : '',
    label,
  };
}
export function restoreSnapshot(text: string): Snapshot {
  const value = z
    .object({
      version: z.literal(1),
      csv: z.string(),
      acquiredAt: z.string().datetime(),
      source: z.enum(['google', 'imported']),
      sourceUrl: z.string(),
      label: z.string(),
    })
    .parse(JSON.parse(text));
  parseSheet(value.csv);
  return value;
}
