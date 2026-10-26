# Session handoff — first implementation

This is the saved project state from the first implementation and its approved local revisions. It is not a new feature plan. The latest delivered section supersedes historical UI notes below; the Sheet remained read-only throughout.

## Delivered state

### Latest revision: hourly refresh on the Workers-hosted dashboard

Auto-refresh now runs every **one hour**, only when enabled and the page is visible. The control reads **Auto-refresh · 1 hour**. Initial retrieval and the manual Refresh button remain immediate; importing a CSV/JSON still disables auto-refresh until explicitly re-enabled. Analytical calculations and Google read-only access are unchanged. This supersedes historical five-minute timing notes below and in the original agent context.

`tests/e2e/auto-refresh.spec.ts` uses a deterministic CSV transport fixture and a browser-controlled clock: no request at five minutes or just before one hour, a request at one hour, immediate manual refresh, disabled/re-enabled behavior and the hidden-tab guard. These are not claimed as live Google observations. The existing real-source cases continue to use actual public Google GETs. Run `npm run check` and `npm run test:worker` for current verification.

The user deployed the prepared Worker to `https://bardata.win`; an anonymous HTTPS check returned 200. `www.bardata.win` did not resolve when inspected. No DNS or Cloudflare domain settings were changed by this revision. The www setup and optional canonical redirect are documented in `../deployment.md`.

### Earlier revision: evidence nested inside source-linked records

The analysis main (`id="analysis"`) now occupies the full dashboard content width in all four views. Source evidence is rendered inside the Source-linked records panel, to the right of its table/sort/pagination column. Existing evidence widths remain 285px by default, 330px on wide desktops and 250px on intermediate screens. At 750px or less, evidence stacks beneath the records and pagination. The surrounding records panel has a shared border/background; table overflow stays local. Evidence still supports source inspection, provider navigation, raw fields, sticky desktop scrolling and focus on inspection. No analytical or source-data behavior changed.

Verification: **68 unit / 58 development-browser / 58 production-preview tests passed**, with zero skipped, flaky or unexpected browser cases, plus typecheck/build. Six new browser cases cover 1440, 1920, 1024, 751, 750 and 390px in all four views: full-width analysis, evidence containment, right-side versus stacked geometry, record inspection/focus, expanded raw fields and no document horizontal overflow. The original brush regression now scrolls the chart back into view after source-point inspection focuses evidence below the charts; a real browser probe confirmed that dragging from the old off-screen coordinates was the sole failure, with brushing intact after scrolling. Both complete suites include direct public Google CSV retrieval and existing accessibility, source-linking, filter and chart-resize checks.

Artifacts: `evidence-layout-{dev,preview}-results.json`, `evidence-layout-fixture-{dev,preview}-{1440,390}.json`, and `../screenshots/evidence-layout-fixture-{dev,preview}-{1440,390}.png`. Layout screenshots/metrics use the explicitly mocked original 67-row fixture, not live-source data. README documents the placement. No dependencies, Sheet writes, replay access, deployment, Git operations or protected AGENTS.md changes were introduced.

### Earlier revision: per-position readiness, own-builder OS, additional coverage

All roles now shows only recorded target coverage, one curve per retained target position in the OS palette; there is no own-AN or pooled coverage line. Explicit individual-role filters keep both own and coverage curves. Branching uses the actual Role filter, not the number of retained positions. Each position has its own ongoing denominator, while all-role cards remain pooled; caption/key/hover and Methodology explain the distinction. Full provider context, modeled basis, partial opt-in, null gaps, clock marker and fixed axes remain unchanged.

OS charts already used own AN milestones rather than received allied coverage. New headings, tooltips and cohort notes make builder-owned timing/OS explicit, while counts omit missing OS and expose distinct games. Regressions prove covered nonbuilders are absent and later own builders are not assigned their providers' earlier times. Existing descriptive quadratic fits, palette, independent layers, role visibility, source clicks and brushing remain intact.

The **OS & neighboring coverage** panel occupies the right column under compact OS relationship, beside the front panel. Horizontal 100% stacked bars compare ten-point half-open builder OS bands, with Unranked separate, for 0 / 1 / 2+ distinct additional recorded roles. Builder completion/OS/coverage all come from the same row; duplicate roles count once and the builder's own role is excluded. Valid completion eligibility is independent of Game Clock and timing display, includes completion at the endpoint and outside the viewport, and retains descriptive partial/review history. Unknown/missing fields have disjoint exclusions. Blank cells are none recorded, not confirmed poor placement; recorded roles cannot establish physical adjacency or AN-radius geometry. Hover/table expose 1+ and 2+ numerator/N, game counts, and inspectable source builders. Use Role to compare like positions; no causal or predictive claim is made.

Verification: **68 unit / 52 development-browser / 52 production-preview tests passed**, zero skipped/flaky/unexpected browser cases, plus typecheck/build and formatting. Test-first failures covered changed timing/OS labels, new coverage functionality, updated Methodology and physical resize bounds. Live dev/production retrieved **531 rows / 36 games**; each of eight position curves matched all **781 seconds**, including every front category and explicit Air mode. Additional-coverage bars matched an independent reference for **179 builders**, including **54 Tech**. Desktop 1440 and mobile 390 coverage plots were 408/340px wide and 379px tall, with no clipped labels or horizontal overflow. These are retrieval-time counts, not constants.

Responsive Plotly exposed a physical zero-height node after filter rerenders then resizing: it can replace pixel layout height with 100% on an auto-height node. `Chart` now gives non-fill plot nodes a definite height; fill plots still use stretched-panel sizing. A dedicated offline browser regression failed before and passed after the fix; both node and SVG dimensions are checked. Compact caption styling keeps the first chart row within the 1440×900 viewport without shrinking plots.

Artifacts:

- `position-coverage-final-{unit,dev,preview}-results.json`
- `position-coverage-final-live-{dev,preview}.json`: source/readiness/front agreement and bounds
- `position-coverage-final-builder-coverage-live-{dev,preview}.json`: independent band reconciliation and chart bounds
- `../screenshots/position-coverage-final-front-revision-overview-{dev,preview}-{1440,390}.png`
- `../screenshots/position-coverage-final-builder-coverage-live-{dev,preview}-{1440,390}.png`
- `position-coverage-review.json`: independent review and separately labeled parent follow-up

Independent read-only review found no security, logic or requirement blockers. Its nonblocking screenshot suggestion caught verbose hover descriptions printing inside the new bars. Explicit `textposition: 'none'` now suppresses those labels while preserving full hover and accessible tables; the browser regression failed with four unwanted labels before the fix, then passed with none and actual mouse hover showing builder OS and numerator/N. All complete suites above were rerun after the fix and final screenshots recaptured. The review preceded this one-line fix; final reruns were performed by the parent. Historical layout guidance is labeled superseded here; protected AGENTS.md remains unchanged pending any separate authorization.

README, data contract and in-app Methodology document current behavior. The protected root AGENTS.md was not changed; its earlier two-curve and empty-right-column UI notes are superseded by this revision and current README/contract. No dependencies, credentials, Sheet edits, replay access, deployment, Git initialization/commits or DNS changes were introduced.

### Earlier approved revision: front panel alignment and shared front filter (layout superseded above)

The front panel now has the same desktop left-column width as Modeled timing window, with the space beneath OS relationship left empty for a future panel. Both plots use fixed 12:00–25:00 axes and shared horizontal gutters, aligning actual endpoints rather than just panel borders. Mobile remains stacked. The later-build toggle and analytics opt-in are removed; owned completion <=25:00 is permanent for the front cohort. Earlier completions and modeled readiness outside the visible window remain in its summaries; source data, provider context and ongoing denominators are not cropped.

Front situation is a new shared dropdown immediately before AN type: All situations (default), Advantage, Equal, Disadvantage. The target-row raw completion label is matched with the same case/whitespace normalization as the front analytics. Missing/unknown labels match All only; no provider label is borrowed. Cards, charts, selection, evidence, tables and filtered exports follow this filter. Allied providers and match metadata remain full-context. Selected readiness percentages explicitly describe labeled observations, not all-player front-state coverage rates.

Verification: **61 unit, 44 development-browser, 44 production-preview tests passed**, with zero skipped/flaky/unexpected browser cases, plus typecheck/build. New filter/layout/toggle regressions failed before implementation. Tests cover dropdown order/default/reset and selection reset, all four views, filtered-out providers, both timing bases, role changes, desktop/mobile resizing, rendered SVG widths, visible endpoint labels and empty right-column space. Prior readiness, source linking, sparse/qualifying summaries, accessibility and recovery/export regressions remain green. Reports: `front-revision-{unit,dev,preview}-results.json`.

Both real browser builds retrieved **435 rows / 30 games**; the modeled front cohort was **119 builders / 23 games**. Each front filter matched live source references and all **781 seconds per readiness curve**, alongside the All situations baseline. Live filtered row/point counts: Advantage 40/39, Equal 47/46, Disadvantage 36/34. Desktop/mobile panel-width and endpoint discrepancies were **0px**: viewport 1440 endpoints at X=117/632 in both plots, viewport 390 at X=107/337. No document overflow or clipped chart labels was detected. These are retrieval-time measurements, not application constants. Metrics: `live-{dev,preview}.json`; overview screenshots: `../screenshots/front-revision-overview-{dev,preview}-{1440,390}.png`.

Direct Browser Use navigation to loopback was blocked by that tool's private-address restriction, including its local option; live browser verification and screenshots were produced successfully by the project-local Playwright development and production suites instead. Protected `AGENTS.md` was updated after explicit user approval and now documents the current layout, fixed cutoff, shared front filter and verification results. No credentials, Sheet writes, dependency additions, replay access, deployments or Git changes were involved.

Independent read-only review of the final production desktop/mobile screenshots and current source/tests found no desktop, mobile, data-correctness or requirement blockers. Its nonblocking suggestion was to promote the display-window/off-screen-summary explanation from sample details into the visible caption; no additional UI changes were made. README, data contract, collection guide and this latest handoff section were updated during the review, superseding its stale documentation observations; AGENTS.md was subsequently synchronized after user approval. The review modified no files and started no servers or browser suites.

### Earlier approved revision: front situation & AN timing (layout/opt-in superseded above)

The panel beneath the timing charts compares own AN build-event timings **within position**, using Disadvantage/Equal/Advantage front snapshots recorded at that player's construction completion. Individual color/shape-coded points link to source evidence, which now exposes the raw front label. Median ticks and middle-50% segments/table summaries require >=5 builders across >=3 games; same-position Equal differences require both groups to qualify. Sparse groups show points only. These are descriptive display thresholds, not statistical significance or confidence intervals.

Default early cohort uses completion <=25:00, with explicit later-build opt-in and all early points retained. Shared filters/linked selection and observed/modeled timing apply, but the front label/cutoff stay at completion. Modeled after-end events are excluded. Missing front, nonbuilders, unknown labels and unusable timings are not recoded or transferred to allied targets. The descriptive partial/review history is clearly separate from ongoing-game percentages and Game Clock. Exclusions, endpoint/roster provenance and interpretation are in a disclosure and Methodology; sustainable collection guidance does not require nonbuilder/endgame logging.

Verification: **60 unit, 40 development-browser, 40 production-preview tests passed**, zero skipped/flaky browser tests, plus typecheck/build/formatting. New regressions failed before analytics/panel/summary/evidence/methodology implementation. Added edge checks retain the inclusive completion cutoff in both timing bases, remove modeled readiness after end, and reject summary eligibility for many builders clustered in too few matches. Existing percentage/OS/selection/export/accessibility/layout checks still pass.

Both browser builds freshly retrieved **435 rows / 30 games** in the final rerun; the default modeled front cohort contained **119 builders / 23 games**, excluding 287 nonbuilders, 1 unusable timing, 27 timed builders missing front, 0 unrecognized labels, 0 later completions and 1 modeled-after-end event. These are retrieval-time counts, not app constants. Every plotted real-point reference/time matched the analytics; readiness curves still matched all 781 seconds per curve. At desktop 1440 and mobile 390, front tick/axis bounds were inside the chart with no document horizontal overflow. Reports: `front-situation-{unit,dev,preview}-results.json`; live metrics: `live-{dev,preview}.json`; screenshots: `../screenshots/front-situation-live-{dev,preview}-{1440,390}.png`. No dependencies, source writes, replay access, deployment or Git operations were added.

Analytical review found no math blocker and identified one misleading observed-mode hover label. It is fixed: after-end modeled readiness says “outside match” and exposes effective endpoint/provenance, not “online.” A failing-before/passing-after browser hover regression covers this. Additional checks cover real-point clicks at qualifying median/IQR intersections, reference-free summaries, and descriptive readiness exactly at game end versus the ongoing denominator's strict endpoint exclusion. The caption explicitly warns that switching timing basis can change the sample as well as shift timings.

Independent review of the real production desktop/mobile front-panel screenshots found no visible blockers. Nonblocking readability suggestions were stronger median ticks, more separation of crowded mobile Tech status lanes, and less dense caption/tick presentation. No additional visual changes were made; final automated reruns confirmed the updated caption and all chart label bounds. Both reviews were read-only.

### Subsequent approved revision: readiness-percentage timing window

The Modeled Timing Window now plots **AN readiness (%)**, fixed 0–100%, instead of cumulative observations. Its own modeled-online and recorded target-coverage step curves call the same ongoing summary as the cards at every one-second clock value from 12:00 through 25:00. Target filters, linked row selection and partial-roster opt-in remain synchronized. Games leave both numerator and denominator at their effective endpoint, including those that never gained coverage. Unknown observations stay excluded; N=0 is a null gap, not 0% or carried-forward coverage. Hover shows time, percentage, numerator/N and ongoing game count. The selected-clock line and panel-filling layout remain. The construction/model timing switch now affects OS charts and role milestones only; the readiness curves and cards always stay modeled.

Verification: **55 unit, 37 development-browser and 37 production-preview tests passed**, with zero skipped/flaky browser tests, plus typecheck/build and formatting checks. A new regression failed against the old cumulative Y axis before implementation. Analytical and browser tests cover readiness equality, strict endpoint exclusion, unavailable intervals, off-screen milestones, post-end readiness, separate unknown denominators, filtered-out allied providers, partial-roster opt-in, linked selection and timing-basis consistency. Existing OS point/brush, panel fill, desktop/mobile axis bounds, accessibility and source/export recovery tests still pass.

Both browser builds retrieved the public Google CSV directly (HTTP 200) and compared all **781 plotted seconds per curve** against the live-data ongoing summary. Those retrievals contained **388 rows / 28 games**; these are retrieval-time counts, not constants or a source-data audit. Live desktop/mobile measurements showed no document horizontal overflow or clipped axis titles. Reports: `readiness-window-{unit,dev,preview}-results.json`; live metrics: `live-{dev,preview}.json`; screenshots: `../screenshots/readiness-window-live-{dev,preview}-{1440,390}.png`. Earlier cumulative-chart reports below are historical. No Sheet writes, dependencies, replay access, hosting or Git operations were added.

### Subsequent approved revision: timing-window appearance

The cumulative timing chart now fills its panel's available height, without changing the OS chart's height or controls. The hypothesis label and 11:00–20:00 shaded rectangle are removed; the selected-clock marker remains. Both time axes and the Game Clock now start at 12:00 and end at 25:00, keeping the 15:00 default and one-second steps. This is display-only: off-screen observations, cumulative counts, fits and denominators retain their existing meaning.

Verification: **51 unit, 34 development-browser, 34 production-preview tests passed**, plus typecheck/build. A screenshot review exposed a clipped cumulative Y-axis title on mobile; the timing chart now has a 300px minimum height with a title-bounds regression in both timing modes. New layout regressions check both Plotly container and SVG height after viewport changes, filtering and opening/closing neighboring fit notes. Updated tests cover elapsed endpoints, slider bounds/clamping and retained off-screen records. Both browser suites fetched the live public CSV successfully. Live desktop/mobile measurements: `timing-window-live-layout.json`; screenshots: `../screenshots/timing-window-live-{desktop,panels,mobile}.png`. Earlier verification below remains historical.

### Subsequent approved revision: OS trendlines

The OS Relationship graph and its compact Timing Window counterpart now have per-position, color-matched quadratic fits with independent point/trendline switches. Shared switches survive tab/filter/timing-basis changes within the page session. Fits exclude Unranked/unknown OS, retain OS 0 and off-screen observations, require 3 distinct timings, and stop at observed time limits. Exactly 3 builders produce dotted curves with a small-sample warning. Source-point inspection and brushing remain functional, including points lying exactly on a fit; fitted samples are never records. Curve-only hover provides sample size/R², while points-visible hover prioritizes source evidence.

New verification: **51 unit, 30 development-browser, 30 production-preview tests passed**, plus typecheck/build. Unmocked live development/production renders exercised compact/full desktop/mobile and every point/trendline combination without horizontal overflow or clipped control/caption text. Follow-up review found native-legend state lost on layer changes and mobile legend/title crowding; both have failing-before/passing-after regressions and fixes. App now owns hidden positions; external color-key buttons share visibility across both views and leave the mobile plot independent of legend height. See [OS trendline report](os-trendlines-summary.md), `os-trendlines-{unit,dev,preview}-results.json` and `os-trendlines-live-{dev,preview}-review.json`. Earlier results below remain historical. No source writes, dependencies, replay access, deployment or Git operations were added.

- Working React/TypeScript/Vite dashboard with Timing Window, OS Relationship, Match Timeline, and Data Explorer.
- Anonymous public Google CSV retrieval, explicit fresh/cached/imported status, last-good localStorage cache, offline imports, and provenance-preserving exports.
- Strict elapsed parsing; modeled readiness is AN construction completion + 90 seconds under uninterrupted production.
- Full-context roster/metadata/provider calculations before target filtering; explicit same-game/known-team allied coverage, including comma/semicolon-separated additional roles.
- Labeled 30:00 effective-duration placeholders and the exact historical Game 7 duration correction, without changing raw data.
- Timing graph time axes and Game Clock both span 12:00–25:00. The clock defaults to 15:00 and moves by one second. OS charts use time on X, OS on Y.
- Linked chart, table, timeline and source evidence selection; keyboard alternatives, accessibility checks, and mobile layouts.

The app remains local, without a backend, credentials, replay execution, collectors, hosting, or DNS changes. No Git repository or commits were created. Future goals/priorities remain for Chris to specify.

## Documentation state

- `../../README.md`: startup, use, Sheet update workflow, current behavior, code map, verification, scope and known follow-ups.
- `../data-contract.md`: exact headers and modeling/denominator/provenance definitions.
- `../collection-guide.md`: sustainable data-entry and recovery workflow.
- [Root AGENTS.md](../../AGENTS.md): approved and created as the agent-context entry point, covering scope, analytical invariants, code navigation, verification, regression traps, and unimplemented follow-ups. New Hermes sessions should start in the project root to load it automatically.
- The installed `bar-nuke-analysis` skill is supplementary; these project documents do not depend on access to the original chat or profile-local memory.

## Verification baseline and wrap-up

After the Game Clock change: **40 unit tests, 24 development-browser tests, 24 production-preview tests**, with typecheck/build/formatting passing. The clock browser tests verify minimum/maximum, Home/End, boundary clamping, one-second steps and the unchanged default at desktop and mobile widths.

Saved evidence:

- `game-clock-dev-results.json` / `game-clock-dev.log`
- `game-clock-preview-results.json` / `game-clock-preview.log`
- `session-handoff-unit-results.json`, `session-handoff-dev-results.json` / `.log`, and `session-handoff-preview-results.json` / `.log`: final wrap-up rerun, also 40/24/24 passed.
- `live-dev.json` / `live-preview.json`: latest browser source retrieval metrics; overwritten by later live tests, so not immutable historical snapshots.
- `session-handoff-checks.json`: final documentation and verification result summary, created after the checks complete.

The development dashboard was available at `http://127.0.0.1:5173/` during wrap-up. Port 4173 is production preview, not a permanently running service. Process state must be checked rather than inferred from old reports.

## Archived source snapshot

The wrap-up CSV GET completed at **2026-10-01T04:07:40.588Z**:

- 211 retained source rows across 16 games; 206 rows usable for observation calculations.
- 79 valid elapsed AN completion tokens, one invalid `?`, and 131 blank tokens. Valid parsing does not guarantee an in-game or interpretable completion.
- 39 populated explicit coverage lists. All 211 target/provider comparisons against the independent reference calculation matched.
- AN names included Citadel, Umbrella, Oasis, Prevailer and Haven; one cell also contained the role name Front2 in AN Type.
- Game 7 now has valid source duration `0:29:03`, with recorded provenance. Historical `29:03:00` imports still use the exact confirmed local override.

Evidence: [CSV snapshot](session-handoff-source.csv) and [parser/metadata/coverage audit](session-handoff-source-audit.json). Line endings in the archived CSV are normalized; cell values are preserved. These counts describe this retrieval, not a fixed live dataset. New live tests may observe additional rows or edits.

The original acquisition/test fixture remains 67 rows / 7 games. The earlier [Sheet audit](sheet-update-audit.md) is a separate 147-row / 12-game snapshot. Neither should be confused with the current live Sheet or substituted into dynamic live-test expectations.

## Open follow-ups, not new authorization

1. **AN catalogue and markers:** Prevailer and Haven are numerically included, filterable and plotted, but are not recognized canonical categories. They generate warnings and use the generic cross marker. The catalogue is in `../../src/data/normalize.ts`; the OS symbol map is in `../../src/views/OsRelationship.tsx`. Official references confirming their 90-second production are in the earlier Sheet audit. Adding those names/markers remains an unimplemented suggestion.
2. **Time-format review:** Game 10 / Team 1 / Front2 / OS 13, `Sheet1!A107:P107`, exported AN completion `24:50:00`. It is interpreted literally as hours and excluded from interpretable own readiness/in-game provider coverage. If 24 minutes 50 seconds was intended, E107 needs plain-text `24:50`; no automatic correction is authorized.
3. **Other source review:** the snapshot includes missing roles in an in-progress Game 16. Game 15 / Team 1 / Front1, row 182, has AN Type `Front2` (F182); it is preserved and warned on, not converted into a real AN system. Older partial rosters, missing teams, an ambiguous Geo role, and the `?` completion remain visible. Source review items must be rechecked live because Chris continues entering data.
4. **Minor mobile UX:** the earlier independent pixel review noted possible modebar overlap with an upper OS point. It was nonblocking and remains unchanged.
5. **Future product direction:** no specific expansion of collection, analytics or deployment has been approved yet. The existing implementation and stated modeling assumptions are the starting point for the next requested revision.

## Historical verification references

- [Original delivery](summary.md)
- [Render/import/export review remediations](review-fixes.md)
- [Duration and axis revision](duration-axis-summary.md), including the fixed 25:00 boundary-label clipping
- [New types and multiple coverage roles audit](sheet-update-audit.md)

The README contains the reproducible npm and browser setup commands. Evidence in this directory records actual runs, not a guarantee that future source edits or environments will pass unchanged.
