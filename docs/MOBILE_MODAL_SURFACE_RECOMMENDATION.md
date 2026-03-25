# Mobile Modal Surface Recommendation

Reference inputs:
- `docs/DISCERN_DESIGN_BRIEF_2026-03-25.md`
- `docs/frontend_consistency_audit.md`

## Recommendation by surface type

### Keep centered modal
Use centered modal for:
- primary note read/edit inspection
- focused reflection workflows
- short decision actions attached to a single note

Why:
- preserves object continuity (same note object in focus)
- keeps context quiet and intentional
- aligns with content-first reading/editing

### Prefer bottom sheet
Use bottom sheet for:
- dense utility controls (filters, bulk actions, mode-adjacent tools)
- stacked secondary actions that benefit from thumb reach
- transient helper surfaces that should not dominate the note

Why:
- improves mobile reachability
- reduces dead space on short-height screens
- keeps main note content visually grounded behind utility layers

## Implementation heuristic
- If the user is primarily **reading/editing one note**, default to centered modal.
- If the user is primarily **configuring, filtering, or selecting auxiliary options**, default to bottom sheet.
- Avoid mixing both patterns for the same task state.
