# OS relationship quadratic trendlines

## Delivered

The full OS Relationship view and compact Timing Window chart now have position-colored quadratic least-squares curves and independent **Plotted points** / **Quadratic trendlines** checkboxes. Both start enabled. The switches are shared across tabs and survive filter/timing-basis changes within the page session, without changing cohort membership or summary denominators.

Fits use the existing time-on-X / OS-on-Y orientation: `OS = a + b*t + c*t²`. Ranked timed builders only; numeric OS 0 remains valid. Curves require three distinct, numerically usable times, stop at each position's recorded time extremes, and include off-screen records in fitting. Exactly three builders produce a dotted curve and an explicit small-sample warning. Insufficient groups are listed, not given an invented linear fit. Negative fitted OS is omitted from drawing and curve extremes never drive axis limits.

Both graphs include keyboard-accessible position color-key buttons outside the plot; the compact view has collapsed fit details to preserve the dashboard's desktop layout. Clicking a position hides/shows its points and curves without filtering the data. App owns position visibility independently of layers, preserving hidden positions across layer changes and both views; reload restores all positions. Fit-only hover shows sample size/R² where defined; with points visible, real source-record hover/click takes priority. Fitted samples have no row references and brushing uses real points only. Existing keyboard and source-table alternatives remain available.

## Implementation

- `src/analytics/quadraticFit.ts`: centered/scaled time and reorthogonalized QR; sampled least-squares quadratic, sample size and descriptive R².
- `src/views/OsRelationship.tsx`: role fitting, matching colors, layer switches, stable OS extent, external position controls, sparse/interpolation notes and compact disclosure.
- `src/App.tsx` / `src/views/TimingWindow.tsx`: shared page-session layer and position preferences.
- `src/styles.css`: scoped layer controls, compact fit disclosure and color key.
- `tests/analytics/quadraticFit.test.ts`: exact/noisy quadratics, repeated timestamps, missing/singular/nonfinite data, OS 0/constant OS and translated timing basis.
- `tests/e2e/os-trendlines.spec.ts`: all layer combinations, source inspection on exact curve intersections, color matching, keyboard/mobile controls, tab consistency, filtered fits, observed/modeled translation, role legend behavior and off-screen inputs.

## Real verification

- **51/51 unit tests passed**: `os-trendlines-unit-results.json`.
- **30/30 development-browser tests passed**: `os-trendlines-dev-results.json`.
- **30/30 production-preview browser tests passed**: `os-trendlines-preview-results.json`.
- `npm run typecheck` and `npm run build` passed. No dependencies added.
- Both browser suites include an unmocked anonymous Google CSV GET, which returned HTTP 200. Their archived retrievals contained 211 source rows / 16 games / 86 valid elapsed AN tokens. These are retrieval-time counts, not constants or a claim that every timing is in-game/interpretable.
- Separate unmocked development and production visual rehearsals covered 10 states each: compact combined layers and full combined/curves-only/points-only/neither at 1440×900 and 390×844. Every state kept the X range at 10:00–25:00 and the same cohort-derived OS extent; no horizontal overflow, control/caption clipping candidates or browser page errors occurred. Live rendering produced a quadratic for each of the eight supported positions at those retrievals, with Front2 explicitly dotted for its three-point sample.
- Saved chart images: `../screenshots/os-trendlines-live-{dev,preview}-{compact,full}-{both,curves,points,hidden}-{1440,390}.png` (compact only has combined-layer captures).
- Rendered bounds/trace summaries: `os-trendlines-live-dev-review.json`, `os-trendlines-live-preview-review.json`.

The tests also continue to cover visible 10:00/25:00 tick bounds, actual point/box linking, axis swaps, roster/coverage invariants, refresh/import races, accessibility and desktop/mobile layouts.

## Review findings resolved

- Native Plotly legend mutations were discarded when explicit visibility was rebuilt after layer changes. Visibility now combines App-owned hidden positions with independent layer flags. A deterministic eight-position browser regression hides Air, waits for curves to finish disappearing before checking points, switches compact/full views, changes both layer flags, and restores Air via the keyboard. Cohort size stays unchanged.
- The full mobile native legend overlapped the time title, squeezed 0/U ticks, and clipped the long OS title. The external wrapping color key does not consume Plotly's plotting area; a shorter `OS (U = Unranked)` axis title preserves the meaning. A dense eight-position mobile regression verifies title bounds, key/title separation and nonoverlapping 0/U ticks with both layers and curves-only. All live screenshots were regenerated after these fixes.

## Interaction trap resolved

Dense fitted samples can win Plotly hover-distance selection over a real marker lying exactly on a curve. `hoverinfo: 'skip'` alone does not work when a hover template is supplied: Plotly suppresses that property during defaults. The OS chart omits the fit hover template while points are enabled and uses skip, then enables labeled fit hover in curves-only mode. The real-browser regression clicks an exact curve/source intersection and verifies the correct record drawer, rather than checking only SVG existence.

## Scope

Local read-only dashboard only. No Google Sheet writes, parser/source overrides, new AN catalogue entries, replay access/execution, new dependencies, hosting, DNS changes, Git initialization or commits. The pre-existing development server was left untouched.
