import { useMemo } from 'react';
import type { Data, Layout } from 'plotly.js';
import type { Context, Observation } from '../domain/types';
import { roleLandmarks } from '../analytics/landmarks';
import { ongoingReadinessSeries } from '../analytics/summary';
import { formatTime } from '../domain/time';
import { Chart } from '../components/Chart';
import { timeWindowAxis, TIMING_PLOT_GUTTERS } from '../charts/timeAxis';
import { OsRelationship, ROLE_COLORS, type OsLayers } from './OsRelationship';
import { ROLES } from '../data/normalize';
import { escapeHover } from '../charts/text';
import { FrontSituationPanel } from './FrontSituationPanel';
import { BuilderCoveragePanel } from './BuilderCoveragePanel';
export function TimingWindow({
  context,
  rows,
  selectedRole,
  observed,
  time,
  partial,
  onSelect,
  onBrush,
  osLayers,
  onOsLayersChange,
}: {
  context: Context;
  rows: Observation[];
  selectedRole: string;
  observed: boolean;
  time: number;
  partial: boolean;
  onSelect: (ref: string) => void;
  onBrush: (refs: string[]) => void;
  osLayers: OsLayers;
  onOsLayersChange: (layers: OsLayers) => void;
}) {
  const curves = useMemo(() => {
    if (selectedRole) {
      const series = ongoingReadinessSeries(context, rows, 720, 1500, partial);
      return (['own', 'coverage'] as const).map((key) => ({
        key,
        name: key === 'own' ? 'Own AN modeled online' : 'Recorded target coverage',
        label: key === 'own' ? 'Own AN modeled online' : 'Recorded target coverage',
        color: key === 'own' ? '#ffc072' : '#70d9b0',
        series,
      }));
    }
    // Stratify retained targets, not builders or providers; context stays unfiltered.
    const retained = new Set(rows.map((row) => row.role));
    const roles = [
      ...ROLES.filter((role) => retained.has(role)),
      ...[...retained].filter((role) => !ROLES.includes(role)).sort(),
    ];
    return roles.map((role) => ({
      key: 'coverage' as const,
      name: `${escapeHover(role)} · recorded target coverage`,
      label: role,
      color: ROLE_COLORS[role] ?? '#b8c5d2',
      series: ongoingReadinessSeries(
        context,
        rows.filter((row) => row.role === role),
        720,
        1500,
        partial,
      ),
    }));
  }, [context, rows, partial, selectedRole]);
  const unavailable = curves.every(
    ({ series, key }) => series.find((point) => point.seconds === time)?.[key].percentage == null,
  );
  const data = useMemo<Data[]>(
    () =>
      curves.map<Data>(({ key, name, color, series }) => ({
        type: 'scatter',
        mode: 'lines',
        name,
        x: series.map((point) => point.seconds / 60),
        y: series.map((point) => point[key].percentage),
        text: series.map(
          (point) =>
            `${formatTime(point.seconds)}<br>${point[key].numerator}/${point[key].n} eligible observations · ${point.games} ongoing games`,
        ),
        hovertemplate: '%{text}<br>%{y:.1f}%<extra>%{fullData.name}</extra>',
        connectgaps: false,
        line: { shape: 'hv', color, width: 2 },
      })),
    [curves],
  );
  const layout = useMemo<Partial<Layout>>(
    () => ({
      showlegend: false,
      xaxis: timeWindowAxis('Simulation elapsed time'),
      yaxis: {
        title: { text: 'AN readiness (%)' },
        range: [0, 100],
        ticksuffix: '%',
        dtick: 25,
        gridcolor: '#25313e',
      },
      margin: { ...TIMING_PLOT_GUTTERS, t: 12, b: 72 },
      annotations: unavailable
        ? [
            {
              text: 'Readiness unavailable at this clock',
              xref: 'paper',
              yref: 'paper',
              x: 0.5,
              y: 0.98,
              showarrow: false,
            },
          ]
        : [],
      shapes: [
        {
          type: 'line' as const,
          xref: 'x' as const,
          yref: 'paper' as const,
          x0: time / 60,
          x1: time / 60,
          y0: 0,
          y1: 1,
          line: { color: '#edf4fb', width: 1, dash: 'dot' as const },
        },
      ],
    }),
    [time, unavailable],
  );
  return (
    <>
      <div className="timing-grid">
        <section className="panel timing-panel">
          <div className="section-head">
            <h2>Modeled timing window</h2>
          </div>
          <p className="muted">
            {partial ? 'Partial-roster sample included' : 'Ongoing inferred-full games'} ·{' '}
            {selectedRole
              ? 'matches the modeled percentage cards.'
              : 'same ongoing calculation as the cards, stratified by target position; recorded coverage only.'}{' '}
            Ended games leave the denominator; gaps are unavailable.
          </p>
          <ul className="os-color-key" aria-label="Readiness position color key">
            {curves.map(({ name, label, color }) => (
              <li key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  className="os-color-swatch"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>
          <Chart
            data={data}
            layout={layout}
            label={
              selectedRole
                ? 'AN readiness percentages over time for own AN and recorded target coverage'
                : 'Recorded target coverage percentages over time by target position'
            }
            height={300}
            fill
          />
        </section>
        <OsRelationship
          context={context}
          rows={rows}
          observed={observed}
          onSelect={onSelect}
          onBrush={onBrush}
          layers={osLayers}
          onLayersChange={onOsLayersChange}
          compact
        />
      </div>
      <div className="timing-grid timing-secondary-grid">
        <FrontSituationPanel
          context={context}
          rows={rows}
          observed={observed}
          onSelect={onSelect}
        />
        <BuilderCoveragePanel context={context} rows={rows} onSelect={onSelect} />
      </div>
      <section className="panel landmarks">
        <div className="section-head">
          <h3>Role milestones · conditional on timed builders</h3>
          <span className="muted">Not a population protection rate</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Timed AN builders</th>
                <th scope="col">Games</th>
                <th scope="col">Median {observed ? 'completion' : 'modeled online'}</th>
                <th scope="col">No timing / unavailable</th>
              </tr>
            </thead>
            <tbody>
              {roleLandmarks(context, rows, observed).map((v) => (
                <tr key={v.role}>
                  <td>{v.role}</td>
                  <td>{v.n}</td>
                  <td>{v.games}</td>
                  <td>{formatTime(v.median)}</td>
                  <td>{v.unavailable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
