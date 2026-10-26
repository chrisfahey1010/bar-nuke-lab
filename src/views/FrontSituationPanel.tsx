import { useMemo } from 'react';
import type { Data, Layout } from 'plotly.js';
import type { Context, Observation } from '../domain/types';
import {
  analyzeFrontSituation,
  FRONT_SITUATIONS,
  FRONT_SUMMARY_MIN_BUILDERS,
  FRONT_SUMMARY_MIN_GAMES,
  type FrontSituation,
} from '../analytics/frontSituation';
import { formatTime } from '../domain/time';
import { readiness } from '../analytics/readiness';
import { AN_AMMO_DELAY_SECONDS } from '../domain/modelConfig';
import { Chart } from '../components/Chart';
import { escapeHover } from '../charts/text';
import { timeWindowAxis, TIMING_PLOT_GUTTERS } from '../charts/timeAxis';

const COLORS: Record<FrontSituation, string> = {
  Disadvantage: '#e8a1bf',
  Equal: '#b8c5d2',
  Advantage: '#70d9b0',
};
const SYMBOLS: Record<FrontSituation, 'triangle-down' | 'circle' | 'triangle-up'> = {
  Disadvantage: 'triangle-down',
  Equal: 'circle',
  Advantage: 'triangle-up',
};

export function FrontSituationPanel({
  context,
  rows,
  observed,
  onSelect,
}: {
  context: Context;
  rows: Observation[];
  observed: boolean;
  onSelect: (ref: string) => void;
}) {
  const result = useMemo(
    () => analyzeFrontSituation(context, rows, observed),
    [context, rows, observed],
  );
  const data = useMemo<Data[]>(() => {
    const traces: Data[] = [];
    const lane = (role: string, front: FrontSituation) =>
      result.roles.indexOf(role) + (FRONT_SITUATIONS.indexOf(front) - 1) * 0.23;
    for (const front of FRONT_SITUATIONS) {
      const summaries = result.groups.filter(
        (group) => group.front === front && group.summaryEligible,
      );
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: front + ' · middle 50%',
        x: summaries.flatMap((group) => [group.q1 / 60, group.q3 / 60, null]),
        y: summaries.flatMap((group) => [lane(group.role, front), lane(group.role, front), null]),
        line: { color: COLORS[front], width: 5 },
        opacity: 0.55,
        hoverinfo: 'skip',
        connectgaps: false,
      });
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: front + ' · median',
        x: summaries.map((group) => group.median / 60),
        y: summaries.map((group) => lane(group.role, front)),
        marker: {
          color: COLORS[front],
          symbol: 'line-ns',
          size: 17,
          line: { color: COLORS[front], width: 3 },
        },
        hoverinfo: 'skip',
      });
    }
    // Real observations draw last and retain source references; summaries never select rows.
    for (const front of FRONT_SITUATIONS) {
      const points = result.points.filter((point) => point.front === front);
      traces.push({
        type: 'scatter',
        mode: 'markers',
        name: front,
        x: points.map((point) => point.seconds / 60),
        y: points.map(
          (point) => lane(point.row.role, front) + ((point.row.sourceRow % 5) - 2) * 0.025,
        ),
        customdata: points.map((point) => point.row.ref),
        text: points.map((point) => {
          const group = result.groups.find(
            (candidate) => candidate.role === point.row.role && candidate.front === front,
          )!;
          const game = context.games.get(point.row.gameId);
          const ready = readiness(point.row, game?.duration ?? null);
          return `${escapeHover(point.row.role)} · ${front} at completion<br>Completion ${formatTime(point.completion)} · modeled readiness ${formatTime(ready.modeledSeconds)}${ready.outsideMatch ? ' · outside match' : ''}<br>Effective endpoint ${formatTime(game?.duration ?? null)} · ${game?.durationSource ?? 'unavailable'}<br>Game ${escapeHover(point.row.gameId)} · Team ${point.row.teamId ?? 'Unknown'} · OS ${point.row.unranked ? 'Unranked' : (point.row.os ?? 'Unknown')}<br>${group.n} builders / ${group.games.length} games in this group<br>${escapeHover(game?.roster ?? 'unknown')} roster · ${escapeHover(point.row.ref)}`;
        }),
        hovertemplate: '%{text}<extra></extra>',
        marker: {
          color: COLORS[front],
          symbol: SYMBOLS[front],
          size: 8,
          opacity: 0.9,
          line: { color: '#101a24', width: 0.7 },
        },
      });
    }
    return traces;
  }, [result, context]);
  const layout = useMemo<Partial<Layout>>(() => {
    return {
      showlegend: false,
      dragmode: 'pan',
      margin: { ...TIMING_PLOT_GUTTERS, t: 18, b: 50 },
      xaxis: {
        ...timeWindowAxis(observed ? 'AN completion' : 'Own modeled readiness'),
        zeroline: false,
      },
      yaxis: {
        tickmode: 'array',
        tickvals: result.roles.map((_, i) => i),
        ticktext: result.roles.map(escapeHover),
        range: [Math.max(1, result.roles.length) - 0.4, -0.6],
        gridcolor: '#25313e',
        zeroline: false,
      },
    };
  }, [result, observed]);
  const excluded = Object.values(result.exclusions).reduce((total, n) => total + n, 0);
  return (
    <section className="panel front-situation-panel" aria-labelledby="front-situation-title">
      <div className="section-head">
        <h2 id="front-situation-title">Front situation &amp; AN timing</h2>
        <span className="muted">Association, not cause</span>
      </div>
      <p className="front-caption muted">
        Timed builders only · front recorded at their AN completion, not throughout the game.
        Compare colors within the same position; this is not an all-player coverage rate.
      </p>
      <div className="front-controls">
        <span>
          <strong data-testid="front-point-count">{result.points.length}</strong> builders ·{' '}
          {result.games.length} games · {excluded} excluded rows · completion by 25:00
        </span>
      </div>
      <ul className="front-color-key" aria-label="Front situation color and shape key">
        {FRONT_SITUATIONS.map((front) => (
          <li key={front}>
            <span style={{ color: COLORS[front] }} aria-hidden="true">
              {front === 'Advantage' ? '▲' : front === 'Disadvantage' ? '▼' : '●'}
            </span>
            {front} <small>n={result.points.filter((point) => point.front === front).length}</small>
          </li>
        ))}
      </ul>
      {result.points.length ? (
        <Chart
          data={data}
          layout={layout}
          label="Own AN timing by position and front situation at construction completion; individual source observations with median and middle-50-percent summaries"
          height={Math.max(230, result.roles.length * 55 + 85)}
          onPoint={onSelect}
        />
      ) : (
        <p className="front-empty">
          No timed builders with a recognized front situation in this selection. Missing context is
          not Equal or uncovered.
        </p>
      )}
      <p className="front-caption muted">
        Points = recorded builders. Thick segments = middle 50%; vertical ticks = medians. Summaries
        require {FRONT_SUMMARY_MIN_BUILDERS}+ builders across {FRONT_SUMMARY_MIN_GAMES}+ games;
        smaller groups show points only.
        {observed
          ? ' Construction is observed.'
          : ` Readiness adds the modeled ${AN_AMMO_DELAY_SECONDS}s; the front label still belongs to completion.`}{' '}
        Switching timing basis can change the sample: modeled readiness after game end is excluded.
      </p>
      <details className="front-details">
        <summary>Timing comparisons &amp; sample details</summary>
        <p className="muted">
          Median differences compare each position with its own Equal group, only when both meet the
          summary threshold. Earlier/later is descriptive, not a front-state effect or a recommended
          build deadline.
        </p>
        <div className="table-scroll">
          <table aria-label="AN timing summaries by position and front situation">
            <thead>
              <tr>
                <th scope="col">Position</th>
                <th scope="col">Front</th>
                <th scope="col">Builders</th>
                <th scope="col">Games</th>
                <th scope="col">Median</th>
                <th scope="col">Middle 50%</th>
                <th scope="col">Median vs Equal</th>
              </tr>
            </thead>
            <tbody>
              {result.groups.map((group) => (
                <tr key={group.role + group.front}>
                  <td>{group.role}</td>
                  <td>{group.front}</td>
                  <td>
                    {group.n}
                    {!group.summaryEligible && <span className="muted"> · sparse</span>}
                  </td>
                  <td title={'Game IDs: ' + group.games.join(', ')}>{group.games.length}</td>
                  <td>{group.summaryEligible ? formatTime(group.median) : 'Points only'}</td>
                  <td>
                    {group.summaryEligible
                      ? `${formatTime(group.q1)}–${formatTime(group.q3)}`
                      : 'Points only'}
                  </td>
                  <td>
                    {group.deltaEqual === null
                      ? group.front === 'Equal'
                        ? 'Baseline'
                        : 'Insufficient comparison'
                      : group.deltaEqual === 0
                        ? 'Same median'
                        : `${formatTime(Math.abs(group.deltaEqual))} ${group.deltaEqual < 0 ? 'earlier' : 'later'}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          Descriptive history includes partial/review rosters: {result.partialGames} partial ·{' '}
          {result.reviewGames} review · {result.assumedEndpoints} assumed/corrected endpoints. It is
          independent of the Game Clock and partial-roster opt-in used for the ongoing percentages
          above. Completion cutoff: 25:00. The chart shows 12:00–25:00; earlier completions and
          in-scope modeled readiness outside the view remain in the summaries.
        </p>
        <p className="muted" data-testid="front-exclusions">
          Excluded: {result.exclusions.nonbuilders} nonbuilders ·{' '}
          {result.exclusions.unavailableTiming} unusable/invalid timings ·{' '}
          {result.exclusions.missingFront} timed builders missing front ·{' '}
          {result.exclusions.unrecognizedFront} unrecognized labels ·{' '}
          {result.exclusions.laterBuilds} later builds · {result.exclusions.modeledAfterEnd} modeled
          after game end.{' '}
          {result.frontWithoutTiming > 0 &&
            `${result.frontWithoutTiming} rows record front context without a valid build time; no timing is inferred.`}
        </p>
        <p className="muted">
          The front can change before a player builds. Build time and the front recorded at that
          time can influence each other. Nonbuilders have no comparable front snapshot, and players
          in the same match are related observations. Role stratification and OS filters help
          exploration but do not remove selection bias or establish causation. Builder front labels
          are never copied to allied targets; this panel describes own construction/readiness, not
          earliest allied coverage. No extra nonbuilder or endgame logging is required.
        </p>
      </details>
    </section>
  );
}
