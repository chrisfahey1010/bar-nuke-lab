import { useRef } from 'react';
import type { DatasetState } from '../state/dataset';
type Props = {
  state: DatasetState;
  refresh: () => void;
  importFile: (file: File) => Promise<void>;
  auto: boolean;
  setAuto: (v: boolean) => void;
  exportSnapshot: () => void;
};
export function SourceStatus({ state, refresh, importFile, auto, setAuto, exportSnapshot }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const s = state.snapshot;
  return (
    <section className="source-strip" aria-label="Source and refresh">
      <div className="source-text" role="status" aria-live="polite" aria-atomic="true">
        <span className={'dot ' + (state.status === 'fresh' ? 'fresh' : '')} />
        <strong>
          {state.status === 'loading'
            ? 'Refreshing…'
            : state.status === 'fresh'
              ? 'Google CSV · fresh retrieval'
              : state.status === 'imported'
                ? 'Imported · ' + s?.label
                : state.status === 'cached'
                  ? 'Cached · not freshly retrieved'
                  : 'No dataset loaded'}
        </strong>
        {s && <span>Retrieved / imported {new Date(s.acquiredAt).toLocaleString()}</span>}
        {state.error && <span className="warning">{state.error}</span>}
      </div>
      <div className="source-actions">
        <label className="check">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Auto-refresh · 5 min
        </label>
        <button aria-label="Refresh source" onClick={refresh}>
          Refresh
        </button>
        <button onClick={() => input.current?.click()}>Import CSV/JSON</button>
        <input
          ref={input}
          type="file"
          hidden
          aria-label="Import CSV/JSON file"
          accept=".csv,.json,text/csv,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setAuto(false);
              void importFile(file);
            }
            e.target.value = '';
          }}
        />
        <button onClick={exportSnapshot} disabled={!s}>
          Full snapshot
        </button>
      </div>
    </section>
  );
}
