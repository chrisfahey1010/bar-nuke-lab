import type { Context, Filters } from '../domain/types';
import { validationIssues } from '../data/validation';
export function DataExplorer({
  context,
  validationOpen,
  setValidationOpen,
  filters,
  onSearch,
  exportCsv,
  exportJson,
}: {
  context: Context;
  validationOpen: boolean;
  setValidationOpen: (open: boolean) => void;
  filters: Filters;
  onSearch: (search: string) => void;
  exportCsv: () => void;
  exportJson: () => void;
}) {
  const issues = validationIssues(context);
  return (
    <section className="panel explorer">
      <div className="section-head">
        <h2>Data Explorer</h2>
        <div className="actions">
          <button onClick={exportCsv}>Export filtered CSV</button>
          <button onClick={exportJson}>Export filtered JSON</button>
        </div>
      </div>
      <label>
        Search source
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Roles, notes, replay reference…"
        />
      </label>
      <details
        className="validation"
        open={validationOpen}
        onToggle={(e) => setValidationOpen(e.currentTarget.open)}
      >
        <summary>Validation queue · {issues.length} issues in complete dataset</summary>
        <div className="validation-list">
          {issues.map((i, k) => (
            <p key={k}>
              <strong>
                {i.rowRef ?? 'Match context'} · {i.field}
              </strong>
              <br />
              {i.message}
            </p>
          ))}
          {!issues.length && <p>No validation issues.</p>}
        </div>
      </details>
      {context.dataset.missingOptional.length > 0 && (
        <p className="warning">
          Unavailable source capabilities: missing {context.dataset.missingOptional.join(', ')}.
          Timing remains available.
        </p>
      )}
      <p className="muted">
        All original fields and notes remain in the evidence drawer and exports. Target filters
        never remove providers or alter match completeness. Filtered imports are partial
        inventories, not full-roster replacements.
      </p>
    </section>
  );
}
