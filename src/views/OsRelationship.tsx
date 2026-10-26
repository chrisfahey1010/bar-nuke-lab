import { useMemo } from 'react';
import type { Data } from 'plotly.js';
import type { Context, Observation } from '../domain/types';
import { milestones } from '../analytics/landmarks';
import { formatTime } from '../domain/time';
import { Chart } from '../components/Chart';
import { escapeHover } from '../charts/text';
import { AN_AMMO_DELAY_SECONDS } from '../domain/modelConfig';
import { timeWindowAxis } from '../charts/timeAxis';
import { fitQuadratic } from '../analytics/quadraticFit';
export type OsLayers = { points: boolean; trendlines: boolean; hiddenRoles: string[] };
export const ROLE_COLORS: Record<string, string> = {
  Air: '#79cce0',
  Tech: '#ffc072',
  Geo: '#bc9ced',
  Pond: '#70d9b0',
  'Sea geo': '#93b8ff',
  'Sea beach': '#e8a1bf',
  Front1: '#e8d27b',
  Front2: '#8bcf96',
};
const symbols: Record<string, 'circle' | 'diamond' | 'square'> = {
  Citadel: 'circle',
  Umbrella: 'diamond',
  Oasis: 'square',
};
export function OsRelationship({
  context,
  rows,
  observed,
  onSelect,
  onBrush,
  layers,
  onLayersChange,
  compact = false,
}: {
  context: Context;
  rows: Observation[];
  observed: boolean;
  onSelect: (ref: string) => void;
  onBrush: (refs: string[]) => void;
  layers: OsLayers;
  onLayersChange: (layers: OsLayers) => void;
  compact?: boolean;
}) {
  const pts = useMemo(() => milestones(context, rows, observed), [context, rows, observed]);
  const osPoints = useMemo(() => pts.filter((p) => p.row.os !== null), [pts]);
  const pointGames = new Set(osPoints.map((p) => p.row.gameId)).size;
  const missingOs = pts.length - osPoints.length;
  const groups = useMemo(
    () =>
      [...new Set(pts.map((p) => p.row.role))].map((role) => {
        const ranked = pts.filter(
          (p) => p.row.role === role && !p.row.unranked && p.row.os !== null,
        );
        return {
          role,
          rankedCount: ranked.length,
          fit: fitQuadratic(ranked.map((p) => ({ x: p.seconds / 60, y: p.row.os! }))),
        };
      }),
    [pts],
  );
  const data = useMemo(() => {
    const traces: Data[] = [];
    for (const { role } of groups)
      for (const unranked of [false, true]) {
        const group = pts.filter(
          (p) => p.row.role === role && p.row.unranked === unranked && p.row.os !== null,
        );
        if (!group.length) continue;
        traces.push({
          type: 'scatter',
          mode: 'markers',
          name: role + (unranked ? ' · Unranked' : ''),
          legendgroup: role,
          visible: layers.points && !layers.hiddenRoles.includes(role),
          x: group.map((p) => p.seconds / 60),
          y: group.map((p) => (unranked ? -5 : p.row.os!)),
          customdata: group.map((p) => p.row.ref),
          text: group.map(
            (p) =>
              `Game ${escapeHover(p.row.gameId)}, Team ${p.row.teamId ?? 'Unknown'} · ${escapeHover(p.row.role)}<br>Own AN builder · own OS ${p.row.unranked ? 'Unranked' : p.row.os}<br>Own completion ${escapeHover(p.row.raw['AN built time'])} · modeled own readiness ${formatTime(p.seconds + (observed ? AN_AMMO_DELAY_SECONDS : 0))}<br>${context.games.get(p.row.gameId)?.roster} roster · ${escapeHover(p.row.ref)}`,
          ),
          hovertemplate: '%{text}<extra></extra>',
          marker: {
            size: compact ? 9 : 12,
            color: ROLE_COLORS[role] ?? '#b8c5d2',
            symbol: group.map((p) => symbols[p.row.anType] ?? 'cross'),
            line: { color: '#0b1118', width: 1 },
          },
        });
      }
    for (const { role, fit } of groups) {
      if (!fit) continue;
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: role + ' · quadratic fit',
        // Fitted samples must not steal clicks/hover from real records at curve intersections.
        // Curve-only mode exposes fit statistics instead of source-record hover.
        hoverinfo: layers.points ? 'skip' : 'all',
        legendgroup: role,
        visible: layers.trendlines && !layers.hiddenRoles.includes(role),
        x: fit.points.map((p) => p.x),
        y: fit.points.map((p) => (p.y < 0 ? null : p.y)),
        text: fit.points.map((p) => formatTime(Math.round(p.x * 60))),
        hovertemplate: layers.points
          ? undefined
          : `${escapeHover(role)} · quadratic fit<br>Own AN time %{text} · fitted OS %{y:.1f}<br>${fit.n} ranked own AN builders${fit.rSquared === null ? '' : ' · R² ' + fit.rSquared.toFixed(2)}${fit.n === 3 ? '<br>Only 3 points: curve passes through all three' : ''}<extra></extra>`,
        line: {
          color: ROLE_COLORS[role] ?? '#b8c5d2',
          width: compact ? 2 : 2.5,
          dash: fit.n === 3 ? 'dot' : 'solid',
          shape: 'linear',
          simplify: false,
        },
        connectgaps: false,
      });
    }
    return traces;
  }, [context, pts, groups, observed, compact, layers]);
  const yRange = useMemo<[number, number]>(() => {
    const ranked = pts.filter((p) => !p.row.unranked && p.row.os !== null).map((p) => p.row.os!);
    return [pts.some((p) => p.row.unranked) ? -8 : -2, Math.max(10, ...ranked) + 5];
  }, [pts]);
  const layout = useMemo(
    () => ({
      showlegend: false,
      dragmode: 'select' as const,
      xaxis: timeWindowAxis(observed ? 'Observed completion' : 'Modeled AN readiness'),
      yaxis: {
        title: { text: 'OS (U = Unranked)' },
        gridcolor: '#25313e',
        tickvals: [-5, 0, 10, 20, 30, 40, 50, 60, 70],
        ticktext: ['U', '0', '10', '20', '30', '40', '50', '60', '70'],
        range: yRange,
      },
      margin: { l: 50, r: 28, t: 12, b: 48 },
    }),
    [observed, compact, yRange],
  );
  return (
    <section className={'panel os-view' + (compact ? ' os-view-compact' : '')}>
      <div className="section-head">
        <h2>{compact ? 'OS · own AN builders' : 'OS and own AN timing'}</h2>
        <span className="muted">
          {osPoints.length} OS {osPoints.length === 1 ? 'point' : 'points'} · {pointGames}{' '}
          {pointGames === 1 ? 'game' : 'games'}
        </span>
      </div>
      <div className="os-layer-controls" role="group" aria-label="OS chart layers">
        <label className="check">
          <input
            type="checkbox"
            checked={layers.points}
            onChange={(e) => onLayersChange({ ...layers, points: e.target.checked })}
          />
          Plotted points
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={layers.trendlines}
            onChange={(e) => onLayersChange({ ...layers, trendlines: e.target.checked })}
          />
          Quadratic trendlines
        </label>
      </div>
      <Chart
        data={data}
        layout={layout}
        label="Own AN builder OS scatterplot, not received allied coverage, with per-role quadratic trendlines; role colors, AN-type marker shapes, Unranked at U; source records are the keyboard alternative"
        height={compact ? 230 : 340}
        onPoint={onSelect}
        onSelect={layers.points ? onBrush : undefined}
      />
      {groups.length > 0 && (
        <ul className="os-color-key" aria-label="Position color key">
          {groups.map(({ role, rankedCount }) => (
            <li key={role}>
              <button
                type="button"
                aria-pressed={!layers.hiddenRoles.includes(role)}
                title={`${role}: ${rankedCount} ranked own AN builders. Click to hide/show this position.`}
                onClick={() =>
                  onLayersChange({
                    ...layers,
                    hiddenRoles: layers.hiddenRoles.includes(role)
                      ? layers.hiddenRoles.filter((hidden) => hidden !== role)
                      : [...layers.hiddenRoles, role],
                  })
                }
              >
                <span
                  className="os-color-swatch"
                  style={{ background: ROLE_COLORS[role] ?? '#b8c5d2' }}
                  aria-hidden="true"
                />
                {role}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="os-fit-note muted" aria-live="polite">
        <p>Own AN only, not received coverage. {missingOs} missing OS omitted.</p>
        {!layers.points && !layers.trendlines ? (
          <p>Both layers are hidden. Enable points or trendlines to show the graph.</p>
        ) : (
          layers.trendlines && (
            <>
              {!compact && (
                <p>
                  Quadratic fits · ranked own builders · within recorded time ranges, not
                  predictions.
                </p>
              )}
              <details className="os-fit-details" open={!compact}>
                <summary>
                  Fit notes · {groups.filter((g) => g.fit).length}/{groups.length} positions fitted
                </summary>
                {compact && <p>Quadratic · ranked own builders · no extrapolation.</p>}
                {groups.some((g) => !g.fit) && (
                  <p>
                    No curve:{' '}
                    {groups
                      .filter((g) => !g.fit)
                      .map((g) => `${g.role} (${g.rankedCount} ranked)`)
                      .join(', ')}
                    . Needs 3 distinct timings.
                  </p>
                )}
                {groups.some((g) => g.fit?.n === 3) && (
                  <p>Dotted curves: only 3 ranked builders; the curve passes through all three.</p>
                )}
              </details>
            </>
          )
        )}
      </div>
      {!compact && (
        <details className="os-chart-guide muted">
          <summary>Chart guide &amp; fit details</summary>
          <p>
            Circle: Citadel · diamond: Umbrella · square: Oasis · cross: missing/other type. Partial
            games are descriptive evidence. Each point uses the builder's own OS and own completion
            or modeled readiness (+90 seconds), never an allied provider's timing. Invalid or
            after-end completions are excluded; valid observed completion can remain when modeled
            readiness is after game end, so switching basis can also change the cohort. Time view:
            12:00–25:00; records outside the view remain in summaries and the source table. Fits
            summarize OS against own AN time for each position: OS = a + b·t + c·t² (t in minutes),
            not a prediction of build time from OS or a causal effect. The filtered/selected cohort
            includes off-screen timings; Unranked is excluded from fits. Point/game counts describe
            this OS cohort, independent of layer or position visibility. Drag a box on points to
            link a cohort selection. Click a position in the color key to hide/show its visible
            layers.
          </p>
        </details>
      )}
    </section>
  );
}
