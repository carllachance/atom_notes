# Relationship slice (implemented in this pass)

## What is now truly implemented

- `Relationship` persistence now carries lifecycle-aware state across reloads: `proposed`, `confirmed`, `active`, `cooling`, `historical`, `superseded`, and `rejected`, plus `reinforcementScore` so visibility decisions are grounded in stored relationship activity instead of placeholder UI flags.
- Lifecycle updates are now real and event-driven:
  - inferred links still begin as `proposed`
  - explicit links are created as durable, reinforced structure
  - confirming a proposed inference moves it to `confirmed`
  - traversing a link or editing a connected note reinforces it and can reactivate it
  - stale relationships decay into `cooling` and then `historical`
- Default note inspection now suppresses historical links while preserving them for an explicit `History` strip mode.
- The relationship strip now exposes three compact modes with real backing logic:
  - `Related`
  - `References`
  - `History`
- The background relationship web now distinguishes lifecycle state visually:
  - active/current edges remain solid or dashed depending on explicitness
  - historical edges switch to dotted treatment and lower opacity
  - related nodes inherit the same subdued historical treatment
- Relationship explanations shown in the modal now reflect stale inferred links truthfully by appending that the heuristic no longer supports them.
- Scene normalization migrates older persisted data into the new lifecycle shape automatically, including default reinforcement scores for legacy relationships.

## Why this improves clarity

- The modal now answers two different questions cleanly instead of blending them:
  - what matters now
  - what mattered before
- Historical residue no longer competes with the current working set in the default view, which keeps the modal and faint web calmer while still preserving lineage when the user asks for it.
- Reinforcement-backed lifecycle state means traversal and editing affect relationship presence in a way the UI can explain, rather than relying on decorative status cues.

## Calmness check

- Visual noise is reduced in the default open-note path because historical relationships are hidden unless the user explicitly opens `History`.
- The added strip button is intentionally compact and reuses the existing interaction pattern rather than introducing new panels or dense controls.

## Density impact

- No node or edge caps were increased.
- Default density is lower in practice because historical relationships no longer consume visible graph slots until requested.
- Ranking still hard-caps the rendered relationship set to 10 items and the visible node set to 8 items in the background web.

## Trust check

- Inferred links remain visually distinct from explicit links.
- Confirmed inferred links that lose heuristic support are preserved as softer historical context rather than silently disappearing.
- Every inferred relationship still has a one-sentence explanation, and stale inferred links are explicitly labeled as no longer supported by the current heuristic.

## Before / After

- Before: historical and current links were mixed together in the default modal list and graph.
- After: current links stay foregrounded by default, while historical links move into an explicit `History` mode with quieter rendering and persistent explanation.

## What is intentionally still not implemented

- No second-degree relationship rendering yet.
- No intent-aware surfacing layer yet.
- No additional ontology types such as `task_dependency` or `conflicts_with` yet; this slice only strengthens lifecycle behavior for the currently implemented `references` and `related_concept` types.
- No dedicated review queue for proposed inferred links beyond inline confirmation in the modal.
