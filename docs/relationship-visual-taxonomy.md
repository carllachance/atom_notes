# Relationship visual taxonomy

This canvas intentionally separates **meaning** from **grouping** so the relationship web stays readable under the modal.

## Legend

- **Direct / explicit note relationships**: semantic-colored, solid, slightly heavier edges. These are the clearest factual links.
- **Inferred / contextual relationships**: semantic-colored, dashed, lighter edges with lower opacity and a subtle breathing motion. These remain visibly provisional even when amplified.
- **Project grouping relationships**: neutral grouped hulls derived from shared `project:` / `#project:` anchors. They create a soft field around related notes instead of more edge spaghetti.

## Implementation notes

- All relationship taxonomy tokens live in `src/relationships/relationshipVisuals.ts`.
- Hover/selection should only amplify opacity or halo treatment; category-defining cues stay stable.
- Project groups are capped and rendered as grouping behavior, not as additional semantic edges.
- If a note pair does not share a project anchor, no project grouping field is rendered.
