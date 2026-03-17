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
- Archived-target relationships are excluded from visible graph ranking so they do not consume graph slots, but still included in totals.
- Confirmed inferred relationships that lose heuristic support are retained, marked stale in UI, and receive a ranking penalty.
- If stale confirmed inferred relationships exist for the active note and are graph-eligible, at least one stale edge is forced into the visible ranked set.
- Relationship dedupe is enforced by unordered pair + type across inferred/explicit/confirmed-inferred merge paths.

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

## Ranking formula

`score = explicitnessBoost * typeWeight * stateWeight * stalePenalty * recencyWeight * confidence`

Where stale penalty applies only to confirmed inferred relationships with `heuristicSupported === false`.
