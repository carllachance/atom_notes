# Relationship slice (implemented in this pass)

## What is now truly implemented

- `Relationship` is persisted in `SceneState` with `heuristicSupported` so confirmed inferred links can be represented as either still-supported or stale.
- Inference is real and local:
  - shared URL => inferred `references`
  - shared normalized keywords (2+) => inferred `related_concept`
- Ranking is edge-first and capped:
  - edge cap = 10
  - node cap = 8 applied after target-note dedupe
- Relationship strip totals are computed from all first-degree relationships for the active note (including archived targets).
- Relationship detail uses progressive disclosure:
  - `All` stays summary-first with relationship type totals/cards
  - selecting a type reveals only that relationship slice
  - the relationship inspector can still be opened from the slice or the background web
- Archived-target relationships are excluded from visible graph ranking so they do not consume graph slots, but still included in modal relationship totals and stale-counted context.
- Confirmed inferred relationships that lose heuristic support are retained, marked stale in UI, and receive a ranking penalty.
- If at least one stale confirmed inferred relationship exists for the active note and is graph-eligible (non-archived target), at least one stale relationship must be included in the visible ranked graph set.
- Relationship dedupe is enforced by unordered pair + type across inferred/explicit/confirmed-inferred merge paths.
- In-place relationship edits preserve the relationship id, reconcile inferred duplicates for the same note pair, and can be undone back to the prior snapshot.

## Inference and ontology priority

For a single note pair in one inference pass, URL overlap takes precedence over keyword conceptual inference:

- if shared URL exists, infer `references` and stop for that pair in that pass
- keyword conceptual inference is skipped for that pair in that pass

This is an intentional simplification in this slice to avoid producing multiple inferred edges for the same pair by default.

## What is intentionally still not implemented

- No second-degree relationship rendering.
- No full lifecycle state machine beyond `proposed` / `confirmed` plus stale-support tracking.
- No automatic stale pruning/deletion policy.
- No intent-aware surfacing layer.
- No backend sync/collaboration.

## Adjacent surface behavior

- The Insights panel now renders as a slim right rail with one expand/collapse toggle and compact mode buttons.
- The note modal now uses a content-first two-column layout on wide screens and collapses back to a single column on smaller screens.
- Archive / Focus actions are still available, but demoted into a quieter secondary-actions area so note content remains primary.

## Ranking formula

`score = explicitnessBoost * typeWeight * stateWeight * stalePenalty * recencyWeight * confidence`

Where stale penalty applies only to confirmed inferred relationships with `heuristicSupported === false`.
