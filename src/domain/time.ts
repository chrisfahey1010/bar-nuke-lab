import type { ParsedTime } from './types';
export function parseElapsed(raw: string): ParsedTime {
  if (raw === '') return { kind: 'blank', raw };
  if (!/^\d+:[0-5]\d$/.test(raw) && !/^\d+:[0-5]\d:[0-5]\d$/.test(raw))
    return { kind: 'invalid', raw };
  const parts = raw.split(':').map(Number);
  const seconds =
    parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number.isSafeInteger(seconds) ? { kind: 'valid', seconds, raw } : { kind: 'invalid', raw };
}
export function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const s = Math.floor(seconds);
  const sec = String(s % 60).padStart(2, '0');
  return s >= 3600
    ? `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${sec}`
    : `${Math.floor(s / 60)}:${sec}`;
}
