# BAR Nuke Lab verification

Project: `/home/chris/dev/localprojs/bar-nuke-lab/`.
Verified at: 2026-09-30T10:50:30.972956+00:00.

## Execution

| Check | Result |
|---|---|
| `npm run test` | 36 passed |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0 |
| `npm run test:e2e` | 19 passed |
| `npm run test:preview` | 19 passed |
| `npm audit --audit-level=moderate` | Exit 0 |
| `npx prettier --check src tests *.ts *.json` | Exit 0 |

Every recorded final check exited zero. Full stdout is retained beside this report. Browser suites exercise all four views, shared cohort filters, observed/model switch, clock boundaries, actual Plotly SVG rendering/point click/box selection, source/provider references, candidate double-salvo evidence, unavailable denominators, once-per-game metadata imports, failure recovery, read-only controlled additions, and downloaded CSV/JSON. Axe WCAG A/AA and keyboard/focus/dialog/tab tests passed.

Deterministic React-component regressions cover asynchronous chart and file-read races. CSV/JSON regressions cover later-row extra cells, filtered roundtrip validation and raw/generated namespace collisions. See `review-fixes.md` for the independent review findings and parent fixes.

## Real-source browser verification

Development and production preview both performed direct anonymous Google CSV fetches without a proxy. Latest production response: HTTP 200; 67 rows, 7 games and 29 valid AN elapsed observations. Retrieval timestamp: 2026-09-30T10:50:26.077Z.

The acquisition contains 30 populated AN tokens, including a literal `?` retained as invalid, not a nonbuilder. Games 1–6 lack endpoints. Game 7 exports literal `29:03:00`; strict h:mm:ss parsing preserves its 29-hour interpretation and flags endpoint review. No source values were repaired or written.

## Rendered geometry and screenshots

| Viewport | Document width | Main chart bottom |
|---|---:|---:|
| 1440 × 900 | 1440 | 804.1 |
| 1920 × 1080 | 1920 | 808.1 |
| 390 × 844 | 390 | 1572.4 |

The default timing chart and linked OS plot fit within the desktop first viewport. Document-width assertions passed in default and nondefault Air/OS/game/missing-duration states at all three sizes. Narrow tables scroll internally. Screenshots are actual production-preview Playwright captures of the acquired real-source fixture, not invented dashboard observations.

- `docs/screenshots/air-missing-duration-1440x900.png`
- `docs/screenshots/air-missing-duration-1920x1080.png`
- `docs/screenshots/air-missing-duration-390x844.png`
- `docs/screenshots/default-1440x900.png`
- `docs/screenshots/default-1920x1080.png`
- `docs/screenshots/default-390x844.png`

**Outstanding visual verification:** direct screenshot pixel inspection could not be completed. The browser inspection tool was blocked by its provider/private-address restrictions and a locked real-profile fallback. No user browser was closed and no Hermes/browser configuration was changed. Actual project-local Playwright capture, real-source fetching, geometry, overflow, keyboard and accessibility verification all succeeded. Screenshots are provided for visual review; this report does not claim a completed pixel-level visual audit.

## Startup

```bash
cd /home/chris/dev/localprojs/bar-nuke-lab
npm run dev
```

Development: `http://127.0.0.1:5173/`.

```bash
cd /home/chris/dev/localprojs/bar-nuke-lab
npm run build
npm run preview
```

Production preview: `http://127.0.0.1:4173/`.

Both loopback servers were health-checked during delivery. Ports are strict; Ctrl+C stops a foreground server. The application is standalone and does not require this chat session. Reinstall from the lockfile using `npm ci` if needed; full usage/recovery instructions are in `README.md`.

## Boundaries

Implementation covers Tasks 0–8. Task 8's direct pixel inspection remains outstanding as noted. No Google Sheet writes, format/permission changes, replay access/execution, optional Tasks 9–10, global/system package installs, hosting, DNS, or game-settings changes. All app dependencies and test assets are project-local.
