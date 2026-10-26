# Sustainable collection

Keep the single Sheet1 grid. One row per player, full roster when possible, with Team ID 1/2. Record AN construction completion/type, not ammunition readiness. Blank AN completion means no owned AN before game end; if type is known but time is missing, use notes and resolve the timestamp exception.

Record Game duration and Replay name on any ONE row per match. Repeated agreeing values are allowed; conflicts need review. Use elapsed `m:ss` or `h:mm:ss`, never clock time. For a 29-minute 3-second game use `29:03`, not `29:03:00` (that is 29 hours). Sheet plain-text formatting is a separately approved change; the app does not change cells.

Record apparent Other positions covered as comma- or semicolon-separated roles, for example `Sea beach, Front2`. Use the supported spellings: Air, Tech, Geo, Pond, Sea geo, Sea beach, Front1, Front2. Record the actual AN system name in AN Type; a previously unrecognized name is retained and modeled, not discarded, though it may generate a category warning. Put role names in Position/Other positions covered, not AN Type.

Record the FIRST nuclear shot/salvo, target roles and a brief outcome note. A double-nuke opening can stay one episode described in notes. Optional salvo size belongs in notes; legacy Num nukes launched is not automatically salvo size. Later missiles need no collection.

Edit existing rows or add new rows in the same Sheet without renaming the column headers. Click Refresh in the dashboard to retrieve the update; no app rebuild is required. Auto-refresh also retrieves data every hour while the dashboard is visible and enabled. Check the validation queue for incomplete or mistyped cells. The app does not fix source values or reformat the Sheet.

Replay name is literal copyable evidence; this static app cannot open/launch local replays. No new ammo/status/complete-roster/event tabs or economy telemetry. Prefer consistent spectating selection and include short matches. Missing historical teams/durations stay visible rather than guessed.

## Front context without extra endgame work

For each timed owned AN build, record `Front situation upon AN build` as **Disadvantage**, **Equal** or **Advantage** for that player's team at construction completion. Keep it event-specific; do not backfill missing snapshots from the eventual winner or another player's later AN. Unknown/unobserved context can stay blank.

Nonbuilders need no added front-situation entry, and no continuous front-state or late-game logging is required. The front panel deliberately compares timed builders within a position, not front-specific all-player coverage rates. It includes completions through 25:00 with no later-build opt-in; later recorded builds remain in the Sheet and full source context. The shared Front situation filter selects recorded completion labels only; missing values are not inferred. This cannot establish that the front caused a timing change.

## Offline recovery

Download the current tab as CSV or use the app's full-snapshot JSON export. Import via “Import CSV/JSON”. The app labels imports as imported and retrieval timestamps are not Sheet modification timestamps. A failed live refresh keeps the last-good snapshot labeled cached/stale. All external access is read-only.
