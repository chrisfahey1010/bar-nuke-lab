import type { Context, Filters } from '../domain/types';
type Props = {
  context: Context;
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
};
export function FilterBar({ context, filters: f, onChange, onReset }: Props) {
  const update = (p: Partial<Filters>) => onChange({ ...f, ...p });
  return (
    <section className="filterbar" aria-label="Shared cohort filters">
      <label>
        Role
        <select aria-label="Role" value={f.role} onChange={(e) => update({ role: e.target.value })}>
          <option value="">All roles</option>
          {[...new Set(context.dataset.rows.map((r) => r.role))].sort().map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        OS minimum
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Any"
          value={f.osMin ?? ''}
          onChange={(e) => update({ osMin: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </label>
      <label>
        OS maximum
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Any"
          value={f.osMax ?? ''}
          onChange={(e) => update({ osMax: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={f.includeUnranked}
          onChange={(e) => update({ includeUnranked: e.target.checked })}
        />
        Include Unranked
      </label>
      <label>
        Front situation
        <select
          aria-label="Front situation"
          value={f.front}
          onChange={(e) => update({ front: e.target.value })}
        >
          <option value="">All situations</option>
          <option value="Advantage">Advantage</option>
          <option value="Equal">Equal</option>
          <option value="Disadvantage">Disadvantage</option>
        </select>
      </label>
      <label>
        AN type
        <select
          aria-label="AN type"
          value={f.anType}
          onChange={(e) => update({ anType: e.target.value })}
        >
          <option value="">All types</option>
          <option value="$missing">Missing type / nonbuilder</option>
          {[...new Set(context.dataset.rows.map((r) => r.anType).filter(Boolean))]
            .sort()
            .map((t) => (
              <option key={t}>{t}</option>
            ))}
        </select>
      </label>
      <label>
        Game
        <select aria-label="Game" value={f.game} onChange={(e) => update({ game: e.target.value })}>
          <option value="">All games</option>
          {[...context.games.keys()].map((id) => (
            <option key={id} value={id}>
              Game {id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Roster
        <select
          aria-label="Roster"
          value={f.roster}
          onChange={(e) => update({ roster: e.target.value })}
        >
          <option value="">All (descriptive)</option>
          <option value="full">Inferred full</option>
          <option value="partial">Partial</option>
          <option value="review">Review</option>
        </select>
      </label>
      <button onClick={onReset}>Reset</button>
    </section>
  );
}
