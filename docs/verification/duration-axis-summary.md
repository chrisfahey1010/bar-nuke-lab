# Duration and chart-axis revision

## Delivered behavior

- Unknown durations use a labeled 30:00 effective endpoint. Invalid/conflicting source durations retain validation issues while using the same explicitly assumed fallback.
- Game ID `7` with exact source duration `29:03:00` uses the user-confirmed 29:03 endpoint. Other games and tokens retain strict elapsed parsing. Later valid source entries override this assumption.
- Raw source CSV/tokens remain unchanged. The Sheet is read-only, and no replay access or execution is involved.
- Endpoint provenance appears in the sample strip, denominator, selected evidence, timeline and derived CSV/JSON fields.
- Timing Window and compact/full OS charts default to 10:00–25:00. OS charts put readiness/completion on X and OS on Y, preserving Unranked separately.
- Changing the visible time range does not remove early/late source rows or change cohort statistics.

## Actual verification

- Vitest: 40 passed, 0 failed.
- Development browser: 22 passed, 0 skipped/flaky/unexpected.
- Production-preview browser: 22 passed, 0 skipped/flaky/unexpected.
- Typecheck, production build and formatting checks passed.
- Both browser suites retrieved the actual public Google CSV successfully with no credentials or proxy.
- Actual source remains 67 rows / 7 games; Games 1–6 use 1,800-second placeholders; Game 7 uses 1,743 seconds with original 104,580-second parsing retained as source evidence.
- Tech at 15:00: recorded coverage 2/6 (33.3%) across full-roster Games 1/3/7; partial-roster opt-in 5/12 (41.7%).
- Actual point-click/box-selection linking, observed/modeled axis modes, outside-window records, strict endpoint cutoff, imports/exports, axe accessibility and keyboard interactions passed.
- Responsive checks cover 1440×900, 1920×1080 and 390×844 without horizontal page overflow.
- Additional unmocked production screenshot capture confirmed both X ranges `[10,25]`, swapped OS coordinate titles, no horizontal overflow and no browser errors. See `duration-axis-visual-states.json` and `../screenshots/revision-*.png`.

The dedicated inspection browser is blocked by a locked real Chrome profile; no browser settings or user Chrome processes were changed. Independent review directly inspected four screenshots and compared the source changes against the baseline; it passed with no blockers. A follow-up fixed the review suggestion about a hidden 25:00 label by increasing right margins from 12 to 28 pixels. A failing-then-passing browser regression now asserts both 10:00 and 25:00 ticks are visible with nonzero bounds entirely inside compact/full/mobile charts. All suites were rerun after this fix, and actual production captures and bounds probes reconfirmed it. The remaining nonblocking suggestion is that the mobile modebar can overlap an upper point when visible.

## Result files

- `duration-axis-unit-results.json`
- `duration-axis-dev-results.json` and `duration-axis-dev.log`
- `duration-axis-preview-results.json` and `duration-axis-preview.log`
- `duration-axis-visual-states.json`
- `live-dev.json` and `live-preview.json` (include endpoint provenance)

The app is available at http://127.0.0.1:4173/ (production preview) and http://127.0.0.1:5173/ (development). Reload the production tab to use the rebuilt assets.
