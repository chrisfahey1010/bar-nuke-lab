# BAR Nuke Lab

Local, read-only first-nuke timing dashboard for Chris's Supreme Isthmus 8v8 observations. React + TypeScript + Vite, modular Plotly scatter charts, Papa Parse, Zod, Vitest and Playwright.

The existing implementation is the starting point for future revisions. The Google Sheet remains the editable source of truth; this app preserves source evidence and derives timing/coverage without writing back. Larger product goals will be defined in future requests, not inferred from the original implementation plan.

## Start

Dependencies are installed and locked in this project. Supported runtime: Node 22.12+ (verified with Node 22.23.0 and npm 10.9.8).

```bash
cd /home/chris/dev/localprojs/bar-nuke-lab
npm run dev
```

Open **http://127.0.0.1:5173/**. Loopback only; no backend, credentials, accounts or dev proxy.

Production preview:

```bash
cd /home/chris/dev/localprojs/bar-nuke-lab
npm run build
npm run preview
```

Open **http://127.0.0.1:4173/**. Stop either foreground server with Ctrl+C. If a port is already in use, stop the existing app server instead of accidentally testing a different service; strict ports are enabled.

To reproduce a clean dependency installation: `npm ci`. All dependencies are project-local. No system/global installation is required.

## Use

1. Select a target role, OS range, Unranked inclusion, AN type, game and roster state. Descriptive views include historical partial games by default.
2. Move the Game Clock from **12:00 to 25:00**, in one-second increments, with a **15:00 default**. Home/End select the endpoints. The timing chart fills its panel vertically and shows the selected clock marker without a hypothesis label or shaded interval. With **All roles**, it shows recorded target coverage separately for each position, using the OS chart's position colors, without a pooled coverage or own-AN line. Selecting an individual Role restores both own-AN and recorded-coverage curves. Proportions use effective ongoing-game endpoints (recorded, 30:00 placeholders or confirmed corrections); unavailable is not 0%. The Timing Window and OS time axes show 12:00–25:00, with AN time on X and OS on Y in the OS chart. This display range does not discard observations.
3. Switch construction vs modeled readiness for the OS charts and role milestones. The Modeled Timing Window and percentage cards always use modeled readiness. Its Y axis is **AN readiness, 0–100%**, not cumulative counts: all curves use the same ongoing-game calculation at every one-second Game Clock value. All-role curves have position-specific denominators, while cards remain pooled; individual-role curves agree with the cards. Ended games leave both numerator and denominator at their endpoint; no eligible interpretable observations produces a gap, not 0%. Filters, linked selection and partial-roster opt-in affect the graph and cards together. Hover shows the position, percentage, numerator/N and ongoing game count.
4. Click a chart point or **Inspect** a table row. Providers can be inspected even if their OS/role/type is outside the target cohort. The full match context is never filtered away.
5. Drag a box on the OS chart to link the selected cohort to the table and highlighted timeline lanes. The **Keyboard chart selection** multi-select is the keyboard alternative. Clear the linked selection or change a cohort filter to reset it.
6. Use **Match Timeline** for explicit teams, AN completion → modeled online intervals, silo/first nuclear ammo/player-first launch evidence and candidate opening shot/salvo. Opening launch evidence is not impact evidence. The legacy count is not inferred salvo size.
7. Use **Data Explorer** for source search, sorting, validation and filtered CSV/JSON downloads. Full snapshot JSON retains all source rows and original raw CSV. Replay references are copyable strings, not Play buttons.

Analysis uses the full dashboard width in every view. **Source evidence** lives inside **Source-linked records**, to the right of the record table on desktop and beneath the table/pagination at widths of 750px or less. Inspection, provider links and keyboard focus still target the same selected-record evidence.

Keyboard: Tab/Shift+Tab for controls; arrow keys/Home/End for tabs and the clock slider; Escape closes Methodology and returns focus. Inspect moves focus to the evidence heading. Tables and the keyboard multi-select are chart alternatives. Tables scroll internally on narrow screens; the document does not overflow horizontally.

### OS relationship curves

Both OS charts use **own AN builders only**: the row's own construction completion (or +90s modeled readiness) paired with that same builder's OS. A player receiving coverage from an ally is not a timing point unless they also build their own AN; their own time is used even if allied coverage arrived earlier. This was already the analytical behavior and is now explicitly labeled and regression-tested.

Both OS charts now show a **quadratic (squared) least-squares trendline per position**, using the same color as that position's plotted points. **Plotted points** and **Quadratic trendlines** are independent switches: show both, points only, curves only, or neither. The switches are shared between the compact Timing Window chart and the full OS Relationship view, and retain their choices while changing tabs, filters, or timing basis. They reset to both enabled on a page reload.

- Fits summarize **OS against AN time** on the existing axes, not AN time predicted from OS. They use ranked timed builders in the current filtered/linked cohort; Unranked stays at U and is excluded from fitting. Numeric OS 0 is included.
- A fit needs at least **3 distinct timings**. Insufficient data is explained rather than silently replaced with a linear fit. A curve based on exactly 3 builders is dotted and explicitly labeled as passing through those three observations.
- Each curve stops at its own recorded time limits. Off-screen observations still contribute to fitting; the 12:00–25:00 viewport is not a data filter. Negative fitted OS is not plotted, and fitted curves do not determine the OS axis limits.
- Both views have a keyboard-accessible position color key below the plot. Click a position to hide/show its points and curves without changing the cohort; hidden positions are struck through. Position visibility is shared across tabs and retained when changing either layer switch, filters, or timing basis. All positions reset to visible on reload. Fit notes and the full chart guide keep methodological detail out of the main chart area.
- With points visible, hovering/clicking prioritizes real source records. In **curves-only** mode, hover shows the fitted OS, ranked sample size and R² where defined. R² measures descriptive fit, not prediction confidence. Box selection selects real points only; keyboard/source-table selection remains available with points hidden.

These curves summarize the recorded sample, not a proven causal relationship or a protection/launch forecast. Switching construction to modeled readiness shifts comparable timings by 90 seconds; it does not create a new relationship. Existing match-end eligibility still applies.

### OS & neighboring coverage

The new panel beneath **OS relationship** shows horizontal 100% stacked bars for builders in ten-point OS bands, with **0, 1, and 2+ additional positions recorded as covered** by their own AN. Each bar labels its builder count; hover and **Coverage rates & builder records** expose numerator/N, distinct games, the 1+ recorded share, and inspectable source records. Unranked stays separate from OS 0. Use the shared **Role** filter to compare the same position rather than a mix of Air/Tech/front roles.

- The denominator is valid own AN builders, not all players or coverage recipients. Builder OS, completion and explicit coverage lists all belong to the same row. Duplicate covered roles count once, and the owner's role is not additional coverage.
- Blank coverage cells mean **none recorded**, not confirmed poor placement. Missing coverage columns, unrecognized lists, invalid timings and missing OS are excluded rather than counted as zero. Recorded positions do not establish physical adjacency or actual AN radius geometry.
- This is a completion-based descriptive cohort, independent of Game Clock, timing basis and ongoing full-roster opt-in. Builds outside the timing viewport and valid completion at game end remain included. Partial/review games and assumed endpoints are disclosed.
- Shares describe this builder sample, not a causal OS effect or a future probability model. Small samples, role mix, related same-match observations, unidentified repeat players and incomplete recording can affect the pattern. No new Sheet fields are needed.

### Front situation & AN timing

The panel below the timing charts compares **own AN construction/readiness among recorded builders**, grouped by position and the team's front situation at completion. On desktop it occupies the same left-column width as Modeled timing window, alongside the new builder OS/coverage panel under OS relationship. Both plotted timelines use identical horizontal gutters so 12:00 and 25:00 align vertically; mobile keeps the stacked layout. Each point links to its source record. Color and shape distinguish Disadvantage, Equal and Advantage; compare these within a position, not across a pooled mix of roles. Shared filters and linked selection apply.

- Fixed cohort: valid completion **at or before 25:00** with a recognized front label; no later-build toggle. The chart view is **12:00–25:00** in both timing modes. Earlier completions and modeled readiness outside that view remain in cohort summaries; later completions are excluded from this panel, not deleted from the source or percentage-card context.
- **Front situation** is a shared dropdown immediately before AN type. It defaults to **All situations**, with **Advantage**, **Equal**, and **Disadvantage** options. It matches each target row's recorded completion label after trimming/case-insensitive matching; missing/unrecognized labels remain in All situations only. Cards, graphs, linked targets, tables and filtered exports follow it. Match context and allied providers remain available regardless of their front labels. Selected percentages are labeled as recorded observations, not all-player coverage under a continuous front state.
- The timing-basis switch selects observed completion or modeled own readiness (+90 seconds). The cutoff and front label stay anchored to construction completion. Modeled times after the effective game endpoint are excluded; observed valid completion can remain available.
- Individual in-window observations remain visible for small groups. Median ticks, middle-50% segments and table summaries require **at least 5 builders across 3 games**. This is a display safeguard, not statistical significance. The middle 50% is an interquartile range, not a confidence interval.
- **Timing comparisons & sample details** shows qualifying medians/ranges, builder and distinct-game counts, and median timing differences from the same position's Equal group when both qualify. Sparse groups show points only, not a promoted median or a fabricated difference. Exclusion counts and endpoint/roster provenance are available there too.
- This descriptive history includes partial/review matches independently of the Game Clock and ongoing partial-roster percentage opt-in. Missing/nonbuilder front context is excluded, not Equal, disadvantage or uncovered. Provider front labels are never assigned to allied covered targets.

The useful question is **“Among this position's early recorded builders, how did timing differ when the front was labeled differently at completion?”** It cannot answer “How much did the front cause build time to change?” or “What percentage of all players were covered under each front state?” Front labels are measured at an event-dependent time, nonbuilders lack a comparable snapshot, and same-match observations are related. No extra nonbuilder/endgame logging is needed for this comparison; collection remains lightweight.

## Refresh and offline recovery

The fixed public source is:

`https://docs.google.com/spreadsheets/d/1KOvDzr5li30oBIp_yWNXyauAgZ9Tav4N7tJchd4CK_c/export?format=csv&gid=0`

Fetch on open, **Refresh**, and every five minutes while the page is visible when auto-refresh is enabled. Requests use GET, omitted credentials, no-store caching and a 20-second timeout. A newer refresh/import supersedes older requests. Successful data is cached in browser localStorage. Failures or unusable source responses keep the last-good snapshot explicitly labeled cached/not freshly retrieved. Retrieval timestamps are not Sheet modification times.

To update dashboard data, edit existing Sheet records or add rows, preserve the literal column headers, and click **Refresh**. No rebuild or restart is needed for data-only updates. Record times as elapsed `m:ss` or valid `h:mm:ss`; plain-text cells avoid accidental clock-time formatting. `Other positions covered` accepts comma- or semicolon-separated roles, for example `Sea beach, Front2`. A later valid game duration replaces a placeholder automatically. See [collection instructions](docs/collection-guide.md).

For offline use, **Import CSV/JSON** accepts a Sheet CSV or this app's version-1 JSON snapshot. The bundled read-only acquisition at `data/acquisitions/sheet.csv` is an actual source snapshot, not synthetic data. Import it explicitly if live access is blocked; imported data is never labeled live. Import disables auto-refresh until re-enabled. The app cannot prevent a browser from blocking CORS/network access, but the same credential-free source fetch has been verified in both development and production preview.

Filtered JSON/CSV exports are partial inventories on re-import, not full-context replacements. JSON keeps raw fields and derived fields in separate namespaces and preserves extra-cell errors on re-import. CSV contains the union of all retained raw fields plus named derivations; if a source header collides with a generated `derived_*` name, the generated CSV name is prefixed with `lab_` until unique. Treat CSV from untrusted sources as data rather than executable spreadsheet formulas.

## Model and source contract

**AN completion + 90 seconds; assumes uninterrupted ammunition production.** The named configuration constant is in `src/domain/modelConfig.ts`. The same delay applies to valid completion times regardless of recognized, unknown, or missing AN type. Raw completion values remain unchanged. Official BAR references for Prevailer and Haven also confirm 90-second interceptor production; the type-catalogue limitation below affects classification/markers, not those calculations.

- Team ID is match-local literal 1/2; blank stays unknown. No row-order inference.
- Coverage uses the owner's role and separately parsed explicit additional roles. Comma/semicolon lists are not treated as one combined role. Allied lookup uses the complete same-game/same-known-team dataset before target filters. No whole-team or geometric coverage assumption.
- Exactly 16 usable player rows infer a full roster, strengthened by an 8/8 split. Duplicates, role repetition and overcounts are flagged, not deduplicated. Team-label completeness is separate from roster size.
- Duration/replay can appear on any one row per game. Agreeing repeats aggregate. Unknown durations, including invalid/conflicting source endpoints, use a labeled 30:00 placeholder; conflicts remain in validation. Replay conflicts stay unavailable. Game 7 has a user-confirmed local 29:03 correction for the exact `29:03:00` export token. Raw source evidence remains unchanged. The fallback and exact-token correction are configured in `src/domain/modelConfig.ts`.
- Blank AN completion means no owned AN before game end. Type-without-time and invalid times are unknown rather than confirmed nonbuilders.
- Default percentage denominators are interpretable recorded roster slots in inferred-full games with an effective duration **strictly greater** than the selected time. Partial analysis is opt-in and sample-labeled. These are not verified survivors/intact bases. Descriptive builder-only timings still work without endpoints.
- Readiness curves use those time-varying denominators, not all-history builder counts or a fixed denominator. Their percentages can rise or fall as games end and the remaining cohort changes. Unknown observations are excluded consistently with the cards; unavailable values are not joined across gaps.
- Own modeled readiness and recorded allied coverage are distinct. A known completion remains useful with unknown team. Readiness beyond the effective game end is not plotted as an in-game online event. Endpoint provenance is visible in the sample strip, ongoing denominator, selected record and timeline, and exported as `derived_duration_source`, `derived_recorded_duration_seconds` and `derived_duration_note`.
- Multi-missile openings remain one analytical episode. Earliest recorded teammate launch is a candidate opening, not proof of complete launch collection; later strikes are not pooled. No hit-success forecast, saturation simulator or ammo monitoring.

Full definitions and collection instructions: [data contract](docs/data-contract.md), [collection guide](docs/collection-guide.md).

### Snapshot history and current data

The live Sheet is growing. Counts in saved artifacts are **point-in-time observations, not application constants**:

- The original acquisition and deterministic test fixture contain **67 rows / 7 games**, with 29 valid elapsed AN times and one literal `?`. Historical Tech percentages in the duration/axis report refer to this sample, not today's live data.
- The saved [coverage/type audit](docs/verification/sheet-update-audit.md) examined **147 rows / 12 games**, including 25 coverage lists and 6 multi-position lists. All 147 target coverage/provider comparisons matched independently calculated expectations.
- The wrap-up source snapshot at **2026-10-01T04:07:40.588Z** contains **211 rows / 16 games** and 79 valid elapsed AN times. Some newly entered rows were still incomplete; original values and validation diagnostics are retained. This is a source snapshot, not a claim that every row has interpretable timing.
- At wrap-up, Game 7 exports valid **`0:29:03`**, so its 29:03 endpoint is now recorded source evidence rather than an active local correction. The exact old-token override remains available for historical imports. Games without valid endpoints still use explicitly labeled 30:00 assumptions.

See [session handoff](docs/verification/session-handoff.md) for archived source evidence and open issues. Future checks should fetch the live CSV rather than assume these counts or source cells remain unchanged.

Only games with recorded first-launch evidence provide opening case studies. Missing launch/coverage/endpoint evidence is not proof of no strike or certain vulnerability.

### Known follow-ups

- **AN catalogue and chart markers:** Citadel, Umbrella, Oasis are recognized categories. Prevailer and Haven remain filterable, plotted, and included in readiness/coverage but generate unknown-category warnings and use the generic cross marker. Registering their canonical names and markers is a suggested future app change, not implemented in this session.
- **Source review:** Game 10 row 107 still exported `24:50:00` for AN completion in the wrap-up snapshot and is flagged as after game end. If 24 minutes 50 seconds was intended, the source needs plain-text `24:50`; the app must not infer that correction. The wrap-up snapshot also contained unfinished Game 16 roles and an `AN Type` value `Front2`. Re-check live cells before proposing corrections.
- **Minor mobile UX:** the previous screenshot review noted that the OS chart modebar can overlap a high point when visible. This was nonblocking and remains a possible refinement.
- **Future goals:** no additional collector, hosting, or analytical-model expansion is approved by this documentation handoff.

## Verification

```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
npm run test:preview
```

`test` runs Vitest once. Playwright starts/verifies the server with `webServer`; `test:preview` tests the built application on port 4173. Both include a real, unmocked Google browser-fetch test; controlled additions/metadata rehearsals use clearly labeled TEST-ONLY import or transport fixtures, never real Sheet writes.

Browser assets are installed under `.browser/`. To reinstall them locally:

```bash
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browser" npx playwright install chromium
```

Optional existing local Chrome override: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run test:e2e`. No system browser-dependency install was used.

Latest evidence-layout verification: **68 unit tests, 58 development-browser tests, and 58 production-preview tests passed**, plus typecheck/build, with no skipped, flaky or unexpected browser cases. New layout regressions cover all four views at six widths (390–1920px), including both sides of the 750px stacking breakpoint, full-width analysis, nested evidence placement, inspection/focus and expanded raw fields without document overflow. Existing real-source, accessibility, chart-linking and resize checks remain green. Reports: `docs/verification/evidence-layout-{dev,preview}-results.json`; explicitly fixture-based desktop/mobile metrics and screenshots are linked in the session handoff.

Earlier position/coverage verification: **68 unit tests, 52 development-browser tests, and 52 production-preview tests passed**, plus typecheck/build and formatting checks, with no skipped, flaky or unexpected browser cases. Both real browser builds retrieved 531 rows / 36 games at verification time; all 781 seconds of each position-specific coverage curve matched the ongoing summaries, including front filters and explicit-role mode. The new coverage bars matched an independent reference for 179 own builders (54 Tech) and retained source inspection, separate Unranked, and actual desktop/mobile SVG bounds with no clipped labels or horizontal overflow. A failing resize regression caught and fixed non-fill Plotly nodes collapsing to zero height after filter rerenders. Independent review found no security, logic or requirement blockers; its bar-label clutter suggestion was fixed and verified by an actual mouse hover regression and final full-suite rerun. Reports: `docs/verification/position-coverage-final-{unit,dev,preview}-results.json`; review: `docs/verification/position-coverage-review.json`. Final live metrics and archived screenshots are linked in the session handoff. Counts describe these retrievals, not fixed source totals.

Earlier front layout/filter verification: **61 unit tests, 44 development-browser tests, and 44 production-preview tests passed**, plus typecheck/build and formatting checks. Tests verify panel widths, empty right-column space, actual timeline-endpoint alignment, fixed axes after basis/role/viewport changes, permanent completion cutoff, dropdown order/default/reset, linked-selection reset and filtered-out allied providers. Both live browsers fetched Google CSV without a proxy and matched all 781 readiness seconds per curve for All situations and each selected front category, plus front source references and desktop/mobile label bounds. Reports: `docs/verification/front-revision-{unit,dev,preview}-results.json`; live metrics/screenshots are linked in the session handoff. Earlier front implementation verification was **60/40/40** in `front-situation-{unit,dev,preview}-results.json`.

Earlier readiness-percentage verification: **55 unit tests, 37 development-browser tests, and 37 production-preview tests passed**, plus typecheck/build and formatting checks. Both browser builds fetched the public Google CSV directly and matched both curves to the ongoing summary at every one of the 781 clock seconds. New regressions cover strict endpoint exclusions, null/unavailable intervals, separate unknown denominators, partial-roster opt-in, filtered-out providers, linked selection and the readiness chart staying modeled in observed mode. Existing desktop/mobile layout, accessibility, OS point/brush and recovery/export checks still pass. Reports: `docs/verification/readiness-window-{unit,dev,preview}-results.json`; live chart measurements and screenshots are linked in the [session handoff](docs/verification/session-handoff.md).

Earlier timing-window appearance verification: **51 unit tests, 34 development-browser tests, and 34 production-preview tests passed**, plus typecheck/build and mobile axis-title clipping checks. Regressions cover panel-filling Plotly SVG height after resizing/filtering/expanding fit notes, removal of hypothesis shading/text, the retained clock marker, 12:00–25:00 elapsed endpoints, slider boundaries and preservation of off-screen observations. Both browser suites include a fresh anonymous Google CSV retrieval. Live desktop/mobile layout measurements are in `docs/verification/timing-window-live-layout.json`.

Earlier OS trendline verification: **51 unit tests, 30 development-browser tests, and 30 production-preview tests passed**, plus typecheck/build and desktop/mobile live-source rendering across all layer combinations. Regressions cover hidden-position persistence and mobile axis/color-key separation. See [OS trendline report](docs/verification/os-trendlines-summary.md) and `os-trendlines-{unit,dev,preview}-results.json` for historical evidence.

Earlier implementation verification, after the clock-slider revision: **40 unit tests, 24 development-browser tests, and 24 production-preview tests passed**; typecheck, build and formatting checks passed. The new clock tests cover 10:00/25:00 bounds, clamping, one-second keyboard steps and the 15:00 default on desktop/mobile. Browser results are `docs/verification/game-clock-{dev,preview}-results.json`; logs are alongside them. The final documentation checks are recorded in [session handoff](docs/verification/session-handoff.md).

Earlier duration/axis results (40/22/22) and independent direct pixel review of four unmocked production screenshots remain historical evidence. A hidden 25:00 boundary label was fixed with extra chart margin and a visible-label/bounds regression in compact/full/mobile plots. Earlier render/import/export review fixes are documented in [review fixes](docs/verification/review-fixes.md); [duration/axis report](docs/verification/duration-axis-summary.md) and [original delivery](docs/verification/summary.md) preserve their original scope. The original dependency audit reported 0 vulnerabilities; this is not a current security guarantee.

Results, layout metrics and screenshots are under `docs/verification/` and `docs/screenshots/`. Playwright HTML reports are under `playwright-report/` and `playwright-report-preview/`; failed runs retain traces/screenshots in their corresponding test-results folders. Responsive checks cover 1440×900, 1920×1080 and 390×844, including nondefault Air/OS filters and placeholder-duration states across the permitted clock range. Analytical tests cover unavailable denominators at/after endpoints. Accessibility checks use axe WCAG A/AA plus automated keyboard/focus scenarios across all four views and Methodology.

## Project map

| Area                                                                                | Location                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Public source URL, schema, CSV adaptation, metadata, validation, export             | `src/data/`                                                  |
| Elapsed parsing, model constants, types                                             | `src/domain/`                                                |
| Readiness, provider coverage, roster inference, ongoing summaries, opening evidence | `src/analytics/`                                             |
| Last-good cache and import/refresh arbitration                                      | `src/state/dataset.ts`                                       |
| Main controls, filters, summaries and selected cohort                               | `src/App.tsx`                                                |
| Four views and reusable evidence/table/chart components                             | `src/views/`, `src/components/`                              |
| Modular Plotly setup, time-axis configuration and hover escaping                    | `src/charts/`, `src/plotly-modules.d.ts`, `vite.config.ts`   |
| Unit/component and browser regressions                                              | `tests/`; original deterministic CSV under `tests/fixtures/` |
| Contracts, saved verification and screenshot evidence                               | `docs/`                                                      |

Data flow: public CSV or imported snapshot → loss-preserving adaptation → full game context → target filters/selection → analytics and views. Provider lookup and game completeness remain based on the full context, not the displayed subset.

## Continuing through Hermes

Use this directory as the project working directory for the next session. The root [AGENTS.md](AGENTS.md), this README, the data contract, collection guide, and saved session handoff provide the context without requiring the original chat. The optional installed `bar-nuke-analysis` skill contains additional reusable domain guidance.

The root `AGENTS.md` is the agent-context entry point, with project scope, analytical invariants, code navigation, verification commands, regression traps, and unimplemented follow-ups. For the next session, a starting prompt can be:

> Continue BAR Nuke Lab at `/home/chris/dev/localprojs/bar-nuke-lab`. Read AGENTS.md, README.md, docs/data-contract.md and docs/verification/session-handoff.md before working on my next requested change.

Hermes context discovery is described in the [official context-files documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files). Outside a Git repository, starting at this project's root matters for automatically loading its `AGENTS.md`.

## Scope and repository state

The application remains local and read-only. No Sheet edits, permissions/format changes, replay access/execution, collector, hosting, DNS changes, or game/settings changes were performed. Original optional Tasks 9–10 were not authorized or implemented. No new product roadmap is implied by the completed Tasks 0–8.

The original implementation handoff predates Git setup. The project now has a public GitHub repository at **https://github.com/chrisfahey1010/bar-nuke-lab**, with `main` as the primary branch and `origin` as the remote. Source code, tests, documentation, saved data snapshots and verification evidence are versioned; installed dependencies, builds, local browsers, generated browser reports and local secrets are excluded.

### Security and public data

- Public source and Git history can be read, copied and forked. Publication does not grant visitors permission to push changes to this repository or edit the Google Sheet.
- The dashboard reads the public CSV with anonymous `GET` requests and omitted credentials. The Sheet identifier, exposed CSV records and committed historical snapshots are public information, not secrets. Do not put confidential data in this feed or its snapshots.
- Google sharing permissions, not application code or an `/edit` URL, control who can edit the Sheet. General link access should be **Viewer**, with Editor access limited to trusted accounts. Owner-side sharing permissions have not been independently verified.
- Keep credentials, environment files and raw cookie-bearing HTTP headers out of Git, including its history. Ignore rules and secret scanners reduce accidental exposure but are not a guarantee against every secret or vulnerability.
- `package.json` retains `"private": true` to prevent accidental npm publication; this does not affect GitHub repository visibility.

### Cloudflare Workers deployment

The deployment target is **Workers Static Assets**, not the legacy Pages workflow. The intended custom domain is **bardata.win**. The existing browser-only Vite app is retained; no backend Worker script or Google credentials are added.

- Node version: `.nvmrc` pins **22.23.0**; npm dependencies and Wrangler are locked.
- Build/verification command: `npm run check` (tests → TypeScript/Vite build → offline Wrangler dry run).
- Deploy command: `npm run deploy`; non-production preview command: `npm run deploy:preview`.
- Output directory: `assets.directory: "./dist"` in `wrangler.jsonc`, with explicit SPA fallback; there is no dashboard output-directory field.
- Workers runtime browser verification: `npm run test:worker` starts a loopback-only emulator and tests the built assets, security headers, source-file isolation and the existing dashboard behavior.
- GitHub's **Verify** workflow audits dependencies, runs the checks and exercises the Workers-hosted browser suite without deployment credentials or a publishing step.

See **[deployment instructions](docs/deployment.md)** for the exact Cloudflare form fields, token handling, local verification and subsequent custom-domain setup. Baseline browser security headers are defined in `public/_headers`.

Repository preparation does **not** create/deploy a Cloudflare project, attach the domain or change DNS. The dashboard continues to read its public Google CSV directly. Chris reports changing general Sheet link access to **Viewer**; owner-side permissions were not independently authenticated.
