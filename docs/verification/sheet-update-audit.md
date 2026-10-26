# Updated Sheet processing audit

Source snapshot retrieved: 2026-10-01T01:40:33.766Z

## Scope and result

Read-only audit of the current anonymous Google CSV through the actual application parser, metadata, readiness, and coverage functions. The browser checks use real Google responses, not mocked data. No Google Sheet changes, replay access, or application-source edits were made. The production build was regenerated for verification.

- 147 source observations across 12 games; all 147 retained as usable observation records. This does not imply every AN timestamp is interpretable.
- No missing optional columns; role names match the supported vocabulary.
- 25 nonempty coverage lists, including 6 multi-role lists: all parsed as separate roles, with zero discrepancies against independent CSV-token expectations.
- All 147 targets checked against an independent same-game/explicit-same-team/earliest-ready-provider calculation: zero provider-set or earliest-time discrepancies.
- Fresh development and production browser checks passed for type filtering, OS chart point positions, source-linked records, four Game 12 coverage targets, and out-of-match timestamp warnings. No JavaScript page errors.
- Existing regression suite: 40 tests passed. Typecheck and production build passed.

## Newly recorded AN systems

| System | Records | Modeled readiness | Current app classification |
|---|---:|---|---|
| Prevailer | 2 | Game 8 Air: 23:30; Game 12 Geo: 12:05 | Retained, filterable, plotted and included in readiness/coverage; reported as an unknown category and uses the generic cross marker |
| Haven | 1 | Game 8 Sea beach: 20:28 | Retained, filterable, plotted and included in readiness/coverage; reported as an unknown category and uses the generic cross marker |

This is an outdated catalogue/presentation issue, not dropped timing evidence. The recognized catalogue and chart-symbol map currently enumerate only Citadel, Umbrella, and Oasis (`src/data/normalize.ts`, `src/views/OsRelationship.tsx`). Add the two verified types in a separately authorized app update; retain validation for truly unknown future names.

Official BAR references confirm both names and their 90-second interceptor production time:
- [Prevailer, Cortex static AN](https://www.beyondallreason.info/unit/corfmd)
- [Haven, Armada AN ship](https://www.beyondallreason.info/unit/armantiship)

## Concrete multi-position example

| Game 12 provider | Observed completion | Modeled readiness | Explicit additional roles | Verified target coverage |
|---|---|---|---|---|
| Team 1 Geo, Citadel, row 134 | 19:24 | 20:54 | `Sea beach, Front2` | Sea beach row 140 and Front2 row 135 each receive 20:54 |
| Team 2 Geo, Prevailer, row 143 | 10:35 | 12:05 | `Front2, Sea beach` | Front2 row 142 and Sea beach row 145 each receive 12:05 |

Role filtering does not remove these Geo providers. The opposite team is not incorrectly given their coverage. The resulting times and source-linked providers were read from the actual browser table and evidence drawer in both development and production.

## Source value requiring review

[Cell E107](https://docs.google.com/spreadsheets/d/1KOvDzr5li30oBIp_yWNXyauAgZ9Tav4N7tJchd4CK_c/edit#gid=0&range=E107), Game 10 / Team 1 / Front2 / OS 13, contains `24:50:00` for AN completion. The strict parser reads this literally as 24 hours 50 minutes, after the recorded 48-minute game endpoint. It is visibly flagged and excluded from interpretable own-AN calculations; it cannot provide in-game coverage to Front1.

If the intended completion was 24 minutes 50 seconds, correct the source cell to plain-text `24:50`, not `24:50:00`. This audit does not infer or apply that correction. The earlier exact Game 7 duration override is unrelated and deliberately does not repair arbitrary hour-form timestamps.

Other validation findings concern historical missing teams, partial/ambiguous rosters, and the existing `?` AN completion at row 14. No coverage-list role validation errors were present.

## Evidence

- `sheet-update-source.csv`: exact public-source CSV snapshot (line endings normalized by artifact copy).
- `sheet-update-audit.json`: per-type records, all explicit coverage lists, metadata, diagnostics and all-target reference comparison.
- `sheet-update-browser-results.json`: real development/production point, table, provider and warning assertions.

