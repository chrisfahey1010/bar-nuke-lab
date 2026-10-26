import { useEffect, useRef } from 'react';
import type { Context, Observation, Snapshot } from '../domain/types';
import { readiness } from '../analytics/readiness';
import { coverage, NO_COVERAGE_LABEL } from '../analytics/coverage';
import { formatTime } from '../domain/time';
import { validationIssues } from '../data/validation';
export function RecordDrawer({
  context,
  row,
  snapshot,
  onSelect,
  focusKey,
}: {
  context: Context;
  row: Observation | undefined;
  snapshot: Snapshot;
  onSelect: (ref: string) => void;
  focusKey: number;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusKey) heading.current?.focus({ preventScroll: false });
  }, [focusKey]);
  const game = row ? context.games.get(row.gameId) : undefined;
  const ready = row ? readiness(row, game?.duration ?? null) : null;
  const cov = row ? coverage(context, row) : null;
  return (
    <aside className="evidence panel" aria-label="Selected record evidence">
      <div className="eyebrow">SOURCE EVIDENCE</div>
      <h2 ref={heading} tabIndex={-1}>
        Selected record
      </h2>
      {row && ready && cov ? (
        <>
          <div className="record-identity">
            <strong>
              Game {row.gameId} · {row.role}
            </strong>
            <span>
              Team {row.teamId ?? 'Unknown'} · OS{' '}
              {row.unranked ? 'Unranked' : (row.os ?? 'Unknown')}
            </span>
          </div>
          <dl className="record-stats">
            <div>
              <dt>Observed completion</dt>
              <dd>
                {row.raw['AN built time'] ||
                  (ready.interpretable
                    ? 'No owned AN by game end'
                    : 'Completion not recorded · needs review')}
                {ready.completion.kind === 'invalid' && ' · invalid'}
              </dd>
            </div>
            <div>
              <dt>Modeled AN readiness</dt>
              <dd className="own">
                {formatTime(ready.modeledSeconds)}
                {ready.outsideMatch && ' · outside match'}
              </dd>
            </div>
            <div>
              <dt>Recorded target coverage</dt>
              <dd className="coverage">
                {cov.seconds === null ? NO_COVERAGE_LABEL : formatTime(cov.seconds)}
              </dd>
            </div>
            <div>
              <dt>Front at AN completion</dt>
              <dd>{row.raw['Front situation upon AN build'] || 'Not recorded'}</dd>
            </div>
          </dl>
          {!ready.interpretable && (
            <p className="warning">
              Completion status needs review; excluded from own-AN calculations.
            </p>
          )}
          <p className="muted">
            {game?.roster === 'full'
              ? 'Inferred full 16-player roster'
              : game?.roster === 'partial'
                ? 'Partial roster'
                : 'Roster needs review'}{' '}
            ·{' '}
            {game?.grouping === 'complete'
              ? 'Known team grouping'
              : 'Unknown / review team grouping'}
          </p>
          <dl>
            <dt>Game duration (effective)</dt>
            <dd data-testid="duration-evidence">
              {game?.duration !== null && game?.duration !== undefined
                ? formatTime(game.duration)
                : 'Missing or conflicting endpoint'}
              {game && ` · ${game.durationSource}`}
            </dd>
            {game?.durationNote && <dd className="muted">{game.durationNote}</dd>}
            <dt>Replay reference</dt>
            <dd className="literal">
              {game?.replay ??
                (game?.replayTokens.length ? 'Conflicting references' : 'Not recorded')}
            </dd>
          </dl>
          {game?.issues
            .filter((i) => i.field === 'Game duration' || i.field === 'Replay name')
            .map((i, k) => (
              <p key={k} className="warning">
                {i.message}
              </p>
            ))}
          <h3>Recorded providers</h3>
          {cov.providers.length ? (
            <ul className="providers">
              {cov.providers.map((p) => (
                <li key={p.ref}>
                  <button onClick={() => onSelect(p.ref)}>
                    {p.role} · {formatTime(readiness(p, game?.duration ?? null).inGameSeconds)}
                  </button>
                  <small>
                    {p.ref}
                    {p.ref === row.ref ? ' · own AN' : ''}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              {row.teamId === null
                ? 'Allied matching unavailable: team unknown.'
                : NO_COVERAGE_LABEL}
            </p>
          )}
          {cov.incomplete && (
            <p className="muted">
              Incomplete provider inventory; recorded coverage is not guaranteed protection.
            </p>
          )}
          {cov.ambiguous && (
            <details open>
              <summary>Ambiguous role candidates ({cov.candidates.length})</summary>
              {cov.candidates.map((r) => (
                <button key={r.ref} onClick={() => onSelect(r.ref)}>
                  {r.role} · OS {r.os} · {r.ref}
                </button>
              ))}
            </details>
          )}
          <h3>Notes</h3>
          <p className="notes">{row.raw.Notes || 'No note recorded'}</p>
          {snapshot.source === 'google' ? (
            <a
              href={
                'https://docs.google.com/spreadsheets/d/1KOvDzr5li30oBIp_yWNXyauAgZ9Tav4N7tJchd4CK_c/edit#gid=0&range=' +
                encodeURIComponent(row.ref.split('!')[1])
              }
              target="_blank"
              rel="noreferrer"
            >
              {row.ref} ↗
            </a>
          ) : (
            <span className="muted">
              Imported row {row.sourceRow} · {snapshot.label}
            </span>
          )}
          <details>
            <summary>All raw fields & validation</summary>
            <dl>
              {Object.entries(row.raw).map(([h, v]) => (
                <div key={h}>
                  <dt>{h}</dt>
                  <dd className="literal">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            {validationIssues(context)
              .filter((i) => i.rowRef === row.ref)
              .map((i, k) => (
                <p className="warning" key={k}>
                  {i.field}: {i.message}
                </p>
              ))}
          </details>
        </>
      ) : (
        <p>
          Select a chart point or inspect a source row to see observed/model values, providers and
          original notes.
        </p>
      )}
    </aside>
  );
}
