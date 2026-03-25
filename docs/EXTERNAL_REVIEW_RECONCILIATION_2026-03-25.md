# External Review Reconciliation (March 25, 2026)

Scope references:
- `docs/frontend_consistency_audit.md`
- `docs/DISCERN_DESIGN_BRIEF_2026-03-25.md`
- normalization passes already landed in `src/styles.css`

Status keys: **Resolved** | **Partially resolved** | **Open** | **Intentionally rejected**.

| External finding | Status | Mapping / decision |
|---|---|---|
| Shelf card metadata collisions (title vs time/badges) | **Partially resolved** | Addressed in this batch by introducing a dedicated shelf footer safe zone and moving timestamps out of the title row (`UI-012A`). |
| Shelf emphasis too heavy in dense lists | **Partially resolved** | Featured/hero emphasis was softened; further tuning remains tied to thread-color identity system (`UI-012B` follow-on). |
| Detached top hierarchy (labels/counts/controls/list) | **Partially resolved** | Group header count and filter labeling were tightened; broader rhythm cleanup continues under `UI-012C`. |
| Floating capture truncates bottom shelf cards | **Partially resolved** | Added mobile safe-area-aware bottom padding for shelf scrolling (`UI-013A`). Verify against additional device classes in QA. |
| Modal anatomy inconsistency on mobile | **Open** | Requires coordinated surface-by-surface anatomy pass (`UI-014A`) beyond this incremental patch. |
| Segmented mode clarity ambiguous | **Partially resolved** | Mode switch now renders as a clearer segmented control with explicit active treatment (`UI-014B`). |
| Contrast/touch-target inconsistencies | **Partially resolved** | Mobile mode tabs moved to safer target sizing; full standards pass still pending (`UI-015A`). |
| Duplicate control affordances in note header | **Open** | Needs explicit action-map consolidation in modal header (`UI-014A`/`UI-014B` follow-on). |
| Introduce new decorative emphasis system | **Intentionally rejected** | Rejected per brief doctrine: no new visual philosophy; apply existing calm/semantic rules only. |

## Open items intentionally left for follow-on
1. Full mobile modal anatomy unification by surface type (`UI-014A`).
2. Full contrast + touch-target audit pass with token-level remediations (`UI-015A`).
3. Remaining heavy emphasis edge cases in mixed-thread groups (`UI-012B`).
