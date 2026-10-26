import { useState, type ReactNode } from 'react';
import type { Context, Observation } from '../domain/types';
import { readiness } from '../analytics/readiness';
import { coverage } from '../analytics/coverage';
import { formatTime } from '../domain/time';
export function RecordTable({
  context,
  rows,
  onSelect,
  selectedRef,
  children,
}: {
  context: Context;
  rows: Observation[];
  onSelect: (ref: string) => void;
  selectedRef?: string;
  children: ReactNode;
}) {
  const [sort, setSort] = useState<'source' | 'os' | 'time'>('source');
  const [page, setPage] = useState(0);
  const sorted = [...rows].sort((a, b) =>
    sort === 'os'
      ? (a.os ?? Infinity) - (b.os ?? Infinity)
      : sort === 'time'
        ? (readiness(a).modeledSeconds ?? Infinity) - (readiness(b).modeledSeconds ?? Infinity)
        : a.sourceRow - b.sourceRow,
  );
  const pages = Math.max(1, Math.ceil(sorted.length / 20));
  const current = Math.min(page, pages - 1);
  const shown = sorted.slice(current * 20, current * 20 + 20);
  return (
    <section className="record-table-region panel" aria-label="Source-linked records">
      <div className="records-list">
        <div className="section-head">
          <h3>
            Source-linked records <span className="muted">({rows.length})</span>
          </h3>
          <label className="inline">
            Sort records
            <select
              aria-label="Sort records"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as typeof sort);
                setPage(0);
              }}
            >
              <option value="source">Source row</option>
              <option value="os">OS ascending</option>
              <option value="time">Modeled time</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table data-testid="records-table">
            <caption className="sr-only">
              Selected cohort source records; inspect for original fields and notes
            </caption>
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Game / team</th>
                <th scope="col">Role</th>
                <th scope="col">OS</th>
                <th scope="col">Completion</th>
                <th scope="col">Modeled online</th>
                <th scope="col">Recorded coverage</th>
                <th scope="col">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const game = context.games.get(row.gameId);
                const ready = readiness(row, game?.duration ?? null);
                const cov = coverage(context, row);
                return (
                  <tr key={row.ref} className={row.ref === selectedRef ? 'selected' : ''}>
                    <td>{row.sourceRow}</td>
                    <td>
                      {row.gameId} / {row.teamId ?? 'Unknown'}
                    </td>
                    <td>{row.role}</td>
                    <td>{row.unranked ? 'Unranked' : (row.os ?? 'Unknown')}</td>
                    <td>{row.raw['AN built time'] || '—'}</td>
                    <td>
                      {formatTime(ready.modeledSeconds)}
                      {ready.outsideMatch ? ' (outside end)' : ''}
                    </td>
                    <td>
                      {cov.seconds === null ? 'No recorded coverage yet' : formatTime(cov.seconds)}
                    </td>
                    <td>
                      <button
                        aria-label={`Inspect source row ${row.sourceRow}`}
                        onClick={() => onSelect(row.ref)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="empty">No observations match these filters.</p>}
        {pages > 1 && (
          <div className="pagination">
            <button disabled={current === 0} onClick={() => setPage(current - 1)}>
              Previous records
            </button>
            <span>
              Page {current + 1} of {pages}
            </span>
            <button disabled={current === pages - 1} onClick={() => setPage(current + 1)}>
              Next records
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
