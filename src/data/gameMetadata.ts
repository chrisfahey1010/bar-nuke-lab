import type { Dataset, Context, Game } from '../domain/types';
import { parseElapsed } from '../domain/time';
import { reviewRoster } from '../analytics/rosters';
import { UNKNOWN_GAME_DURATION_SECONDS, GAME_DURATION_CORRECTIONS } from '../domain/modelConfig';
export function buildContext(dataset: Dataset): Context {
  const games = new Map<string, Game>();
  for (const row of dataset.rows) {
    if (!row.gameId.trim()) continue;
    let g = games.get(row.gameId);
    if (!g) {
      g = {
        id: row.gameId,
        rows: [],
        duration: null,
        recordedDuration: null,
        durationSource: 'recorded',
        durationNote: '',
        durationTokens: [],
        replay: null,
        replayTokens: [],
        roster: 'partial',
        usableCount: 0,
        teams: { '1': 0, '2': 0, unknown: 0 },
        grouping: 'unknown',
        issues: [],
      };
      games.set(g.id, g);
    }
    g.rows.push(row);
  }
  for (const g of games.values()) {
    g.usableCount = g.rows.filter((r) => r.usable).length;
    g.roster = g.usableCount === 16 ? 'full' : g.usableCount > 16 ? 'review' : 'partial';
    for (const r of g.rows.filter((r) => r.usable)) g.teams[r.teamId ?? 'unknown']++;
    g.grouping = g.teams.unknown === 0 ? 'complete' : 'unknown';
    reviewRoster(g);
    g.durationTokens = [
      ...new Set(g.rows.map((r) => r.raw['Game duration'] ?? '').filter(Boolean)),
    ];
    const rawDurations = g.durationTokens.map(parseElapsed);
    const rawSeconds = [
      ...new Set(rawDurations.filter((t) => t.kind === 'valid').map((t) => t.seconds)),
    ];
    g.recordedDuration =
      rawSeconds.length === 1 && rawDurations.every((t) => t.kind === 'valid')
        ? rawSeconds[0]
        : null;
    const correction = GAME_DURATION_CORRECTIONS[g.id];
    const corrected = correction && g.durationTokens.includes(correction.sourceToken);
    const durations = g.durationTokens.map((token) =>
      parseElapsed(
        correction && token === correction.sourceToken ? correction.correctedToken : token,
      ),
    );
    const seconds = [...new Set(durations.filter((t) => t.kind === 'valid').map((t) => t.seconds))];
    g.duration =
      seconds.length === 1 && durations.every((t) => t.kind === 'valid') ? seconds[0] : null;
    if (corrected && g.duration !== null) {
      g.durationSource = 'corrected';
      g.durationNote = `User-confirmed correction: ${correction.sourceToken} → ${correction.correctedToken}; raw Sheet value retained.`;
    }
    if (g.durationTokens.length && g.duration === null)
      g.issues.push({
        field: 'Game duration',
        message: 'Invalid or conflicting duration values: ' + g.durationTokens.join(' | '),
      });
    if (g.duration === null) {
      g.duration = UNKNOWN_GAME_DURATION_SECONDS;
      g.durationSource = 'placeholder';
      g.durationNote = '30:00 placeholder for unknown duration; not a recorded endpoint.';
    }
    if (g.duration !== null && g.duration > 21600)
      g.issues.push({
        field: 'Game duration',
        message:
          'Unusually long endpoint; literal h:mm:ss interpreted, not repaired: ' +
          g.durationTokens.join(' | '),
      });
    g.replayTokens = [...new Set(g.rows.map((r) => r.raw['Replay name'] ?? '').filter(Boolean))];
    g.replay = g.replayTokens.length === 1 ? g.replayTokens[0] : null;
    if (g.replayTokens.length > 1)
      g.issues.push({
        field: 'Replay name',
        message: 'Conflicting literal replay references: ' + g.replayTokens.join(' | '),
      });
  }
  return { dataset, games };
}
