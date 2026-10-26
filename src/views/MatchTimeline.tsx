import { useMemo, useState } from 'react';
import type { Data, Layout } from 'plotly.js';
import type { Context, Observation } from '../domain/types';
import { parseElapsed, formatTime } from '../domain/time';
import { readiness } from '../analytics/readiness';
import { openingStrikes, recordedNuclearTime } from '../analytics/openingStrike';
import { Chart } from '../components/Chart';
import { escapeHover } from '../charts/text';
export function MatchTimeline({
  context,
  rows,
  gameId,
  time,
  onSelect,
  onGame,
}: {
  context: Context;
  rows: Observation[];
  gameId: string;
  time: number;
  onSelect: (ref: string) => void;
  onGame: (id: string) => void;
}) {
  const game = context.games.get(gameId);
  const [selectedStrike, setSelectedStrike] = useState('');
  const lanes = useMemo(
    () =>
      [...(game?.rows ?? [])].sort(
        (a, b) => (a.teamId ?? '3').localeCompare(b.teamId ?? '3') || a.sourceRow - b.sourceRow,
      ),
    [game],
  );
  const targetRefs = useMemo(() => new Set(rows.map((r) => r.ref)), [rows]);
  const strikes = useMemo(() => openingStrikes(context, gameId), [context, gameId]);
  const strike = strikes.find((s) => s.id === selectedStrike) ?? strikes[0];
  const data = useMemo<Data[]>(() => {
    const definitions = [
      {
        name: 'Observed AN completion',
        field: 'AN built time',
        color: '#ffc072',
        symbol: 'circle-open' as const,
      },
      { name: 'Modeled AN online', field: 'modeled', color: '#ffc072', symbol: 'circle' as const },
      { name: 'Silo completion', field: 'Nuke built', color: '#bc9ced', symbol: 'square' as const },
      {
        name: 'First nuclear ammo',
        field: 'First Nuke ready',
        color: '#bc9ced',
        symbol: 'diamond' as const,
      },
      {
        name: 'Player first recorded launch',
        field: 'First Nuke launch',
        color: '#ff9a91',
        symbol: 'star' as const,
      },
    ];
    return definitions.map((d) => {
      const points = lanes.flatMap((row, lane) => {
        const ready = readiness(row, game?.duration ?? null);
        const parsed = parseElapsed(row.raw[d.field] ?? '');
        const seconds =
          d.field === 'modeled'
            ? ready.inGameSeconds
            : d.field === 'AN built time'
              ? parsed.kind === 'valid'
                ? parsed.seconds
                : null
              : recordedNuclearTime(row, d.field, game?.duration ?? null);
        if (seconds === null || (game?.duration != null && seconds > game.duration)) return [];
        return [{ row, lane, seconds }];
      });
      return {
        type: 'scatter',
        mode: 'markers',
        name: d.name,
        x: points.map((p) => p.seconds / 60),
        y: points.map((p) => p.lane),
        customdata: points.map((p) => p.row.ref),
        text: points.map(
          (p) =>
            `${escapeHover(p.row.role)} · Team ${p.row.teamId ?? 'Unknown'}<br>${d.name} ${formatTime(p.seconds)}<br>${escapeHover(p.row.ref)}${targetRefs.has(p.row.ref) ? ' · selected target' : ' · match context'}`,
        ),
        hovertemplate: '%{text}<extra></extra>',
        marker: {
          size: 10,
          color: d.color,
          symbol: d.symbol,
          opacity: points.map((p) => (targetRefs.has(p.row.ref) ? 1 : 0.35)),
        },
      };
    });
  }, [lanes, game, targetRefs]);
  const layout = useMemo<Partial<Layout>>(() => {
    const shapes: Partial<NonNullable<Layout['shapes']>[number]>[] = lanes.flatMap((row, lane) => {
      const r = readiness(row, game?.duration ?? null);
      return r.completion.kind === 'valid' && r.inGameSeconds !== null
        ? [
            {
              type: 'rect',
              xref: 'x',
              yref: 'y',
              x0: r.completion.seconds / 60,
              x1: r.inGameSeconds / 60,
              y0: lane - 0.24,
              y1: lane + 0.24,
              fillcolor: 'rgba(255,192,114,0.12)',
              line: { width: 0 },
            },
          ]
        : [];
    });
    shapes.push({
      type: 'line',
      xref: 'x',
      yref: 'paper',
      x0: time / 60,
      x1: time / 60,
      y0: 0,
      y1: 1,
      line: { color: '#8b9eaf', dash: 'dot', width: 1 },
    });
    if (game?.duration != null)
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: game.duration / 60,
        x1: game.duration / 60,
        y0: 0,
        y1: 1,
        line: { color: '#e7eef6', dash: 'dash', width: 1 },
      });
    const markerTimes = data.flatMap(
      (d) => ('x' in d && Array.isArray(d.x) ? d.x : []) as number[],
    );
    return {
      xaxis: {
        title: { text: 'Elapsed time (min) · launch is not impact' },
        range: [
          0,
          Math.max(
            35,
            time / 60 + 2,
            ...markerTimes.map((x) => x + 3),
            game?.duration != null && game.duration <= 3600 ? game.duration / 60 + 2 : 0,
          ),
        ],
        gridcolor: '#25313e',
      },
      yaxis: {
        tickmode: 'array',
        tickvals: lanes.map((_, i) => i),
        ticktext: lanes.map(
          (r) => `T${r.teamId ?? '?'} · ${r.role} · OS ${r.unranked ? 'U' : (r.os ?? '?')}`,
        ),
        autorange: 'reversed',
        gridcolor: '#25313e',
      },
      height: Math.max(280, lanes.length * 22 + 100),
      margin: { l: 140, r: 15, t: 10, b: 85 },
      shapes,
    };
  }, [game, lanes, time, data]);
  if (!game)
    return (
      <section className="panel">
        <h2>Match and opening-strike timeline</h2>
        <p>No match in selected cohort.</p>
      </section>
    );
  return (
    <section className="panel timeline">
      <div className="section-head">
        <h2>Match and opening-strike timeline</h2>
        <label className="inline">
          Timeline match
          <select
            aria-label="Timeline match"
            value={gameId}
            onChange={(e) => onGame(e.target.value)}
          >
            {[...context.games.keys()].map((id) => (
              <option key={id} value={id}>
                Game {id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted" data-testid="team-groups">
        Team 1: {game.teams['1']} · Team 2: {game.teams['2']} · Unknown: {game.teams.unknown} ·{' '}
        {game.roster === 'full' ? 'Inferred full roster' : game.roster + ' roster'} · Duration:{' '}
        {formatTime(game.duration)} · {game.durationSource}
      </p>
      {game.duration !== null && game.duration > 3600 && (
        <p className="warning">
          Literal endpoint {game.durationTokens.join(' | ')} extends beyond the initial early-window
          view; not converted to a shorter duration.
        </p>
      )}
      <Chart
        data={data}
        layout={layout}
        label="Match player lanes grouped by explicit team; observed AN, modeled online, silo, first nuclear ammo and first recorded player launches"
        height={Math.max(280, lanes.length * 22 + 100)}
        onPoint={onSelect}
      />
      <p className="muted">
        All {game.rows.length} match-context lanes retained;{' '}
        {game.rows.filter((r) => targetRefs.has(r.ref)).length} selected target rows highlighted.
        Shading is construction → modeled online. Player first launches are source evidence; only
        the candidate team opening below is compared.
      </p>
      <div className="opening-buttons">
        {strikes.map((s) => (
          <button
            key={s.id}
            aria-pressed={strike?.id === s.id}
            onClick={() => {
              setSelectedStrike(s.id);
              onSelect(s.records[0].ref);
            }}
          >
            Team {s.teamId ?? 'Unknown'} · candidate first launch {formatTime(s.time)}
          </button>
        ))}
      </div>
      {strike ? (
        <section className="opening-evidence" data-testid="opening-evidence">
          <h3>Candidate opening shot / salvo</h3>
          <p>
            <strong>Launch-time snapshot, not impact · {formatTime(strike.time)}</strong>
          </p>
          <p>
            Targets: {strike.targetRoles.join(', ') || 'Not recorded'} · earliest recorded teammate
            launch, not confirmed complete collection.
          </p>
          <p className="notes">{strike.notes || 'No outcome note recorded'}</p>
          <p className="muted">
            Legacy count(s): {strike.legacyCounts.join(', ') || 'not recorded'}; not interpreted as
            salvo size. Multi-missile openings remain one descriptive episode.
          </p>
          <div className="table-scroll">
            <table>
              <caption>Recorded opposing target coverage at launch</caption>
              <thead>
                <tr>
                  <th>Target role / candidate</th>
                  <th>Estimated coverage</th>
                  <th>At launch</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {strike.targets.map((t) => (
                  <tr key={t.row.ref}>
                    <td>
                      {t.row.role} · OS {t.row.os ?? 'Unknown'}
                      {t.coverage.ambiguous ? ' · ambiguous candidates' : ''}
                    </td>
                    <td>{formatTime(t.coverage.seconds)}</td>
                    <td>
                      {t.coverage.seconds !== null && t.coverage.seconds <= strike.time
                        ? 'Modeled recorded coverage online'
                        : 'No recorded coverage yet'}
                    </td>
                    <td>
                      <button onClick={() => onSelect(t.row.ref)}>{t.row.ref}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!strike.targets.length && (
            <p className="muted">
              No resolved opposing target rows; missing teams/target roles are not filled by
              inference.
            </p>
          )}
        </section>
      ) : (
        <p className="empty">
          No recorded opening launch evidence for this match. Missing launch is not proof there was
          no strike.
        </p>
      )}
      <label className="replay-reference">
        Replay reference
        <input
          aria-label="Replay reference"
          readOnly
          value={game.replay ?? ''}
          placeholder={game.replayTokens.length ? 'Conflicting references' : 'Not recorded'}
        />
      </label>
      <p className="muted">Copyable reference only; no filesystem access or replay execution.</p>
    </section>
  );
}
