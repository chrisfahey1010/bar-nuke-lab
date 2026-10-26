export type RawRow = Record<string, string>;
export type Issue = { field: string; message: string; rowRef?: string };
export type Observation = {
  ref: string;
  sourceRow: number;
  raw: RawRow;
  gameId: string;
  teamId: '1' | '2' | null;
  os: number | null;
  unranked: boolean;
  role: string;
  anType: string;
  coveredRoles: string[];
  targetRoles: string[];
  usable: boolean;
  issues: Issue[];
};
export type Dataset = {
  headers: string[];
  rows: Observation[];
  missingOptional: string[];
  issues: Issue[];
};
export type ParsedTime =
  { kind: 'valid'; seconds: number; raw: string } | { kind: 'blank' | 'invalid'; raw: string };
export type Game = {
  id: string;
  rows: Observation[];
  duration: number | null;
  recordedDuration: number | null;
  durationSource: 'recorded' | 'placeholder' | 'corrected';
  durationNote: string;
  durationTokens: string[];
  replay: string | null;
  replayTokens: string[];
  roster: 'full' | 'partial' | 'review';
  usableCount: number;
  teams: { '1': number; '2': number; unknown: number };
  grouping: 'complete' | 'unknown' | 'review';
  issues: Issue[];
};
export type Context = { dataset: Dataset; games: Map<string, Game> };
export type Filters = {
  role: string;
  osMin: number | null;
  osMax: number | null;
  includeUnranked: boolean;
  front: string;
  anType: string;
  game: string;
  roster: string;
  search: string;
};
export type Snapshot = {
  version: 1;
  csv: string;
  acquiredAt: string;
  source: 'google' | 'imported';
  sourceUrl: string;
  label: string;
};
