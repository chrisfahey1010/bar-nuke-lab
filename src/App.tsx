import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createDatasetStore } from './state/dataset';
import { fetchSheet } from './data/sheets';
import { DEFAULT_FILTERS, selectRows } from './analytics/selectors';
import { readiness } from './analytics/readiness';
import { ongoingSummary, type Rate } from './analytics/summary';
import { formatTime } from './domain/time';
import { exportRecords, exportCsv, exportJson } from './data/export';
import { AN_AMMO_DELAY_SECONDS, UNKNOWN_GAME_DURATION_SECONDS } from './domain/modelConfig';
import { FilterBar } from './components/FilterBar';
import { SourceStatus } from './components/SourceStatus';
import { RecordDrawer } from './components/RecordDrawer';
import { MethodologyDrawer } from './components/MethodologyDrawer';
import { RecordTable } from './components/RecordTable';
import { TimingWindow } from './views/TimingWindow';
import { OsRelationship, type OsLayers } from './views/OsRelationship';
import { DataExplorer } from './views/DataExplorer';
import { MatchTimeline } from './views/MatchTimeline';
import './styles.css';
function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
const store = createDatasetStore(fetchSheet, browserStorage());
const TABS = ['Timing Window', 'OS Relationship', 'Match Timeline', 'Data Explorer'];
const AUTO_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
function download(text: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function RateCard({ label, rate, color }: { label: string; rate: Rate; color: string }) {
  return (
    <div className="rate-card">
      <span>{label}</span>
      <strong className={color}>
        {rate.percentage === null ? 'Unavailable' : rate.percentage.toFixed(1) + '%'}{' '}
        <small>
          {rate.numerator}/{rate.n}
        </small>
      </strong>
    </div>
  );
}
export default function App() {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const c = state.context;
  const snapshot = state.snapshot;
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [time, setTime] = useState(900);
  const [observed, setObserved] = useState(false);
  const [osLayers, setOsLayers] = useState<OsLayers>({
    points: true,
    trendlines: true,
    hiddenRoles: [],
  });
  const [partial, setPartial] = useState(false);
  const [auto, setAuto] = useState(true);
  const [tab, setTab] = useState(0);
  const [method, setMethod] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState<string>();
  const [focusKey, setFocusKey] = useState(0);
  const [brush, setBrush] = useState<string[]>([]);
  useEffect(() => {
    void store.refresh();
  }, []);
  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void store.refresh();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [auto]);
  const targetRows = useMemo(() => (c ? selectRows(c, filters) : []), [c, filters]);
  const rows = useMemo(
    () => (brush.length ? targetRows.filter((r) => brush.includes(r.ref)) : targetRows),
    [targetRows, brush],
  );
  const games = useMemo(() => new Set(rows.map((r) => r.gameId)), [rows]);
  const timed = useMemo(() => rows.filter((r) => readiness(r).completion.kind === 'valid'), [rows]);
  const placeholderGames = [...games].filter(
    (id) => c?.games.get(id)?.durationSource === 'placeholder',
  ).length;
  const correctedGames = [...games].filter(
    (id) => c?.games.get(id)?.durationSource === 'corrected',
  ).length;
  const endpointReviews = [...games].filter((id) =>
    c?.games.get(id)?.issues.some((issue) => issue.field === 'Game duration'),
  ).length;
  const summary = useMemo(
    () => (c ? ongoingSummary(c, rows, time, partial) : null),
    [c, rows, time, partial],
  );
  const selected =
    c?.dataset.rows.find((r) => r.ref === selectedRef) ??
    rows.find((r) => r.role === 'Tech' && readiness(r).completion.kind === 'valid') ??
    rows[0];
  const inspect = (ref: string) => {
    setSelectedRef(ref);
    setFocusKey((v) => v + 1);
  };
  const changeFilters = (f: typeof filters) => {
    setFilters(f);
    setBrush([]);
    setSelectedRef(undefined);
  };
  const onBrush = (refs: string[]) => {
    setBrush(refs);
    setSelectedRef(refs[0]);
  };
  const rawSnapshot = () => {
    if (c && snapshot)
      download(
        exportJson(c, c.dataset.rows, snapshot),
        'bar-nuke-lab-full-snapshot.json',
        'application/json',
      );
  };
  return (
    <>
      <a className="skip-link" href="#analysis">
        Skip to analysis
      </a>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              ↗
            </span>
            <div>
              <h1>BAR Nuke Lab</h1>
              <span>Opening-strike timing · Supreme Isthmus 8v8</span>
            </div>
          </div>
          <div className="model-indicator">
            <span>+{AN_AMMO_DELAY_SECONDS}s model</span>
            <button onClick={() => setMethod(true)}>Methodology</button>
          </div>
        </header>
        <SourceStatus
          state={state}
          refresh={() => void store.refresh()}
          importFile={store.importFile}
          auto={auto}
          setAuto={setAuto}
          exportSnapshot={rawSnapshot}
        />
        {c && snapshot && summary ? (
          <>
            <div className="sample-strip" aria-live="polite">
              <span>
                <strong data-testid="game-count">{games.size}</strong> selected games
              </span>
              <span>
                <strong data-testid="player-count">{rows.length}</strong> observed players
              </span>
              <span>
                <strong data-testid="timed-count">{timed.length}</strong> valid timed AN builds
              </span>
              {placeholderGames > 0 && (
                <span>
                  <strong>{placeholderGames}</strong> × {formatTime(UNKNOWN_GAME_DURATION_SECONDS)}{' '}
                  placeholders
                </span>
              )}
              {correctedGames > 0 && (
                <span>
                  <strong>{correctedGames}</strong> corrected endpoint
                  {correctedGames === 1 ? '' : 's'}
                </span>
              )}
              {endpointReviews > 0 && (
                <button
                  className="warning"
                  onClick={() => {
                    setValidationOpen(true);
                    setTab(3);
                  }}
                >
                  {endpointReviews} endpoint review{endpointReviews === 1 ? '' : 's'}
                </button>
              )}
              <span className="muted">
                {brush.length
                  ? `Linked selection: ${rows.length} of ${targetRows.length} targets`
                  : 'Descriptive cohort includes partial history'}
              </span>
            </div>
            <FilterBar
              context={c}
              filters={filters}
              onChange={changeFilters}
              onReset={() => changeFilters({ ...DEFAULT_FILTERS })}
            />
            <div className="model-note">
              AN completion + {AN_AMMO_DELAY_SECONDS} seconds; assumes uninterrupted ammunition
              production.
            </div>
            <div className="dashboard-grid">
              <main id="analysis" tabIndex={-1}>
                <section className="clock-controls" aria-label="Timing scenario">
                  <label className="clock">
                    Game clock <output htmlFor="game-clock">{formatTime(time)}</output>
                    <input
                      id="game-clock"
                      aria-label="Game clock"
                      type="range"
                      min="720"
                      max="1500"
                      step="1"
                      value={time}
                      onChange={(e) => setTime(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Timing basis
                    <select
                      aria-label="Timing basis"
                      value={observed ? 'observed' : 'modeled'}
                      onChange={(e) => setObserved(e.target.value === 'observed')}
                    >
                      <option value="modeled">Modeled AN readiness</option>
                      <option value="observed">Observed construction</option>
                    </select>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={partial}
                      onChange={(e) => setPartial(e.target.checked)}
                    />
                    Include partial-roster sample
                  </label>
                </section>
                <section className="summary-strip" aria-label="Ongoing-game estimates">
                  <RateCard label="Own AN modeled online" rate={summary.own} color="own" />
                  <RateCard
                    label="Recorded target coverage"
                    rate={summary.coverage}
                    color="coverage"
                  />
                  <div className="rate-card">
                    <span>Eligible ongoing games</span>
                    <strong>
                      {summary.games}
                      <small>
                        {summary.excludedGames} excluded · {summary.excludedRows} rows
                      </small>
                    </strong>
                  </div>
                </section>
                <p className="denominator" data-testid="denominator">
                  {summary.cohort} · own N={summary.own.n}; coverage N={summary.coverage.n} ·
                  unknown: {summary.unknownOwn} own / {summary.unknownCoverage} coverage.{' '}
                  {filters.front && (
                    <span>
                      Front at AN completion: {filters.front} · labeled observations only, not an
                      all-player front-state coverage rate.{' '}
                    </span>
                  )}
                  {(summary.placeholderGames > 0 || summary.correctedGames > 0) && (
                    <span>
                      Endpoint assumptions in this cohort: {summary.placeholderGames} placeholder
                      endpoints ({formatTime(UNKNOWN_GAME_DURATION_SECONDS)}) ·{' '}
                      {summary.correctedGames} corrected.{' '}
                    </span>
                  )}
                  {summary.own.n === 0
                    ? 'Percentage unavailable: requires interpretable rows in games with duration > selected time. Descriptive timing remains available.'
                    : ''}
                </p>
                <div
                  className="tabbar"
                  role="tablist"
                  aria-label="Analysis views"
                  onKeyDown={(e) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                    e.preventDefault();
                    const next =
                      e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? 3
                          : e.key === 'ArrowRight'
                            ? (tab + 1) % 4
                            : (tab + 3) % 4;
                    setTab(next);
                    document.getElementById('tab-' + next)?.focus();
                  }}
                >
                  {TABS.map((label, i) => (
                    <button
                      id={'tab-' + i}
                      key={label}
                      role="tab"
                      aria-selected={tab === i}
                      aria-controls="view-panel"
                      tabIndex={tab === i ? 0 : -1}
                      onClick={() => setTab(i)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <section id="view-panel" role="tabpanel" aria-labelledby={'tab-' + tab}>
                  {tab === 0 && (
                    <TimingWindow
                      context={c}
                      rows={rows}
                      selectedRole={filters.role}
                      observed={observed}
                      time={time}
                      partial={partial}
                      onSelect={inspect}
                      onBrush={onBrush}
                      osLayers={osLayers}
                      onOsLayersChange={setOsLayers}
                    />
                  )}
                  {tab === 1 && (
                    <OsRelationship
                      context={c}
                      rows={rows}
                      observed={observed}
                      onSelect={inspect}
                      onBrush={onBrush}
                      layers={osLayers}
                      onLayersChange={setOsLayers}
                    />
                  )}
                  {tab === 2 && (
                    <MatchTimeline
                      context={c}
                      rows={rows}
                      gameId={filters.game || selected?.gameId || [...games][0] || ''}
                      time={time}
                      onSelect={inspect}
                      onGame={(id) => changeFilters({ ...filters, game: id })}
                    />
                  )}
                  {tab === 3 && (
                    <DataExplorer
                      validationOpen={validationOpen}
                      setValidationOpen={setValidationOpen}
                      context={c}
                      filters={filters}
                      onSearch={(search) => changeFilters({ ...filters, search })}
                      exportCsv={() =>
                        download(
                          exportCsv(exportRecords(c, rows, snapshot)),
                          'bar-nuke-lab-filtered.csv',
                          'text/csv',
                        )
                      }
                      exportJson={() =>
                        download(
                          exportJson(c, rows, snapshot),
                          'bar-nuke-lab-filtered.json',
                          'application/json',
                        )
                      }
                    />
                  )}
                </section>
                <details className="keyboard-selection">
                  <summary>
                    Keyboard chart selection{brush.length ? ` · ${brush.length} selected` : ''}
                  </summary>
                  <label>
                    Linked row selection
                    <select
                      aria-label="Linked row selection"
                      multiple
                      value={brush}
                      onChange={(e) => onBrush([...e.target.selectedOptions].map((o) => o.value))}
                    >
                      {targetRows.map((r) => (
                        <option key={r.ref} value={r.ref}>
                          Game {r.gameId} · Team {r.teamId ?? 'Unknown'} · {r.role} · OS{' '}
                          {r.unranked ? 'Unranked' : (r.os ?? 'Unknown')} · row {r.sourceRow}
                        </option>
                      ))}
                    </select>
                  </label>
                </details>
                {brush.length > 0 && (
                  <button onClick={() => onBrush([])}>Clear linked selection</button>
                )}
                <RecordTable context={c} rows={rows} onSelect={inspect} selectedRef={selected?.ref}>
                  <RecordDrawer
                    context={c}
                    row={selected}
                    snapshot={snapshot}
                    onSelect={inspect}
                    focusKey={focusKey}
                  />
                </RecordTable>
              </main>
            </div>
          </>
        ) : (
          <main id="analysis" className="empty-state">
            <h2>
              {state.status === 'loading'
                ? 'Loading read-only Google CSV…'
                : 'Load your observations'}
            </h2>
            <p>
              Refresh the public source or import CSV/JSON. No synthetic dashboard dataset,
              credentials or Sheet writeback.
            </p>
          </main>
        )}
        <footer>
          Local / read-only · First shot or salvo only · Recorded coverage is not a guaranteed nuke
          outcome
        </footer>
      </div>
      {method && <MethodologyDrawer onClose={() => setMethod(false)} />}
    </>
  );
}
