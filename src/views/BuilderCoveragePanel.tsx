import { useMemo } from 'react';
import type { Data, Layout } from 'plotly.js';
import type { Context, Observation } from '../domain/types';
import { analyzeBuilderCoverage } from '../analytics/builderCoverage';
import { Chart } from '../components/Chart';
import { formatTime } from '../domain/time';
import { escapeHover } from '../charts/text';

const CATEGORIES = ['0 recorded', '1 additional position', '2+ additional positions'];
const COLORS = ['#637489', '#93b8ff', '#70d9b0'];

export function BuilderCoveragePanel({
  context,
  rows,
  onSelect,
}: {
  context: Context;
  rows: Observation[];
  onSelect: (ref: string) => void;
}) {
  const result = useMemo(() => analyzeBuilderCoverage(context, rows), [context, rows]);
  const data = useMemo<Data[]>(
    () =>
      CATEGORIES.map((name, i) => ({
        type: 'bar',
        orientation: 'h',
        name,
        x: result.bands.map((band) => band.percentages[i]),
        y: result.bands.map((band) => band.label),
        text: result.bands.map(
          (band) =>
            `Builder OS ${escapeHover(band.label)}<br>${name}: ${band.counts[i]}/${band.n} builders · ${band.games.length} games<br>1+ recorded: ${(((band.counts[1] + band.counts[2]) * 100) / band.n).toFixed(1)}%<br>Positions: ${escapeHover([...new Set(band.builders.map((p) => p.row.role))].join(', '))}`,
        ),
        hovertemplate: '%{text}<br>%{x:.1f}%<extra></extra>',
        textposition: 'none',
        marker: { color: COLORS[i], line: { color: '#101a24', width: 1 } },
      })),
    [result],
  );
  const layout = useMemo<Partial<Layout>>(
    () => ({
      barmode: 'stack',
      showlegend: false,
      dragmode: false,
      margin: { l: 108, r: 28, t: 12, b: 48 },
      xaxis: {
        title: { text: 'AN builders (%)' },
        range: [0, 100],
        ticksuffix: '%',
        dtick: 25,
        gridcolor: '#25313e',
        fixedrange: true,
      },
      yaxis: {
        type: 'category',
        categoryorder: 'array',
        categoryarray: result.bands.map((band) => band.label),
        autorange: 'reversed',
        tickmode: 'array',
        tickvals: result.bands.map((band) => band.label),
        ticktext: result.bands.map((band) => `${band.label} · n=${band.n}`),
        fixedrange: true,
      },
    }),
    [result],
  );
  const excluded = Object.values(result.exclusions).reduce((sum, n) => sum + n, 0);
  return (
    <section className="panel builder-coverage-panel" aria-labelledby="builder-coverage-title">
      <div className="section-head">
        <h2 id="builder-coverage-title">OS &amp; neighboring coverage</h2>
        <span className="muted">Recorded, not geometric</span>
      </div>
      <p className="coverage-caption muted">
        Among own AN builders: additional positions recorded as covered, by the builder’s OS band.
        Use the Role filter to compare the same position.
      </p>
      <p className="coverage-sample">
        <strong data-testid="coverage-builder-count">{result.builders.length}</strong> builders ·{' '}
        {result.games.length} games · {excluded} excluded rows
      </p>
      <ul className="coverage-color-key" aria-label="Recorded additional positions color key">
        {CATEGORIES.map((name, i) => (
          <li key={name}>
            <span
              className="os-color-swatch"
              style={{ background: COLORS[i] }}
              aria-hidden="true"
            />
            {name}
          </li>
        ))}
      </ul>
      {result.builders.length ? (
        <Chart
          data={data}
          layout={layout}
          label="Recorded additional-position coverage shares among own AN builders by OS band; zero, one or two-plus additional positions"
          height={Math.max(240, result.bands.length * 38 + 75)}
        />
      ) : (
        <p className="front-empty">
          No eligible own AN builders with usable OS and coverage fields in this selection.
        </p>
      )}
      <p className="coverage-caption muted">
        Blank cells mean none recorded, not confirmed poor placement. Additional positions are
        recorded roles, not verified physical neighbors. Small bands are descriptive, not a
        forecast.
      </p>
      <details className="coverage-details">
        <summary>Coverage rates &amp; builder records</summary>
        <div className="table-scroll">
          <table aria-label="Recorded additional coverage rates by builder OS band">
            <thead>
              <tr>
                <th scope="col">Builder OS</th>
                <th scope="col">Builders</th>
                <th scope="col">Games</th>
                <th scope="col">1+ recorded</th>
                <th scope="col">2+ recorded</th>
              </tr>
            </thead>
            <tbody>
              {result.bands.map((band) => (
                <tr key={band.label}>
                  <td>{band.label}</td>
                  <td>{band.n}</td>
                  <td title={'Game IDs: ' + band.games.join(', ')}>{band.games.length}</td>
                  <td>
                    {band.counts[1] + band.counts[2]}/{band.n} ·{' '}
                    {(((band.counts[1] + band.counts[2]) * 100) / band.n).toFixed(1)}%
                  </td>
                  <td>
                    {band.counts[2]}/{band.n} · {band.percentages[2].toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          Equal weight per builder observation; repeat players cannot be identified and same-match
          observations are related. All-role bands mix positions: differences can reflect role mix,
          team strategy or recording, not OS causing better placement. This is conditional on
          building an AN, not the chance that any player builds one.
        </p>
        <p className="muted">
          Completion-based cohort, independent of the Game Clock and timing-basis switch; includes
          builds outside 12:00–25:00 and completion at game end. Descriptive history includes{' '}
          {result.partialGames} partial / {result.reviewGames} review games and{' '}
          {result.assumedEndpoints} assumed/corrected endpoints. Unknown teams are retained because
          this panel uses the builder’s recorded coverage claim, not allied target matching.
        </p>
        <p className="muted" data-testid="builder-coverage-exclusions">
          Excluded: {result.exclusions.nonbuilders} nonbuilders ·{' '}
          {result.exclusions.unavailableTiming} unusable/invalid timings ·{' '}
          {result.exclusions.unsupportedPosition} unsupported positions ·{' '}
          {result.exclusions.missingOs} missing/invalid OS ·{' '}
          {result.exclusions.missingCoverageField} missing coverage field ·{' '}
          {result.exclusions.unknownCoverage} unrecognized coverage lists. {result.blankCoverage}{' '}
          included builders have blank coverage cells. Duplicate listed roles count once; the
          builder’s own role is not an additional position. Missing columns and unrecognized lists
          are excluded, never counted as zero.
        </p>
        <div className="table-scroll coverage-records">
          <table aria-label="Own AN builder coverage source records">
            <thead>
              <tr>
                <th scope="col">Game / position</th>
                <th scope="col">OS</th>
                <th scope="col">Completion</th>
                <th scope="col">Additional positions</th>
                <th scope="col">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {result.builders.map((point) => (
                <tr key={point.row.ref}>
                  <td>
                    {point.row.gameId} · {point.row.role}
                  </td>
                  <td>{point.row.unranked ? 'Unranked' : point.row.os}</td>
                  <td>{formatTime(point.completion)}</td>
                  <td>{point.additionalRoles.join(', ') || 'None recorded'}</td>
                  <td>
                    <button
                      onClick={() => onSelect(point.row.ref)}
                      aria-label={`Inspect ${point.row.gameId} · ${point.row.role}`}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
