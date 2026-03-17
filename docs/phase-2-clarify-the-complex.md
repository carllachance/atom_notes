# Phase 2 — Clarify the Complex

## North star

**Make the existing loop better, not bigger.**

Capture → Work → Recall → Resume

Everything in Phase 2 should make the loop:

- faster
- clearer
- more trustworthy

## Philosophy

V1 proved the core mechanics:

- summon/dismiss works
- spatial memory works
- capture is fast
- restoration is exact

Phase 2 deepens four areas only:

- retrieval
- context depth
- light intelligence
- gentle maintenance

Phase 2 explicitly avoids product sprawl (project management, workflow automation, collaboration platform behavior, heavy taxonomy systems, or graph UI).

## Anti-corruption rules

1. No feature may reposition notes automatically.
2. No feature may override user spatial layout.
3. No feature may introduce persistent UI noise.
4. All intelligence must be user-triggered.
5. Workspace restoration logic must remain untouched.

Use this as a hard gate before implementation.

## Architecture delta (extend, don’t rewrite)

Existing foundation remains primary:

- `notesStore`
- `workspaceStore`
- `uiStore`
- existing services

Phase 2 adds isolated services and small UI augmentations.

### New services

```text
services/
  searchService.ts
  relatedNotesService.ts
  aiService.ts
  attachmentService.ts
```

Service constraints:

- read from stores
- return ranked/suggested results
- do **not** mutate note positions or workspace layout

## Pillar 1 — Retrieval that feels instant

### Inline search (overlay, not mode)

Design:

- summon via `/` or `Ctrl+K`
- display as an ephemeral overlay over canvas
- results render as cards, not database rows
- selecting a result either:
  - jumps to note in place (if visible), or
  - temporarily surfaces note near center

Search must act as a lens. It must never generate a separate search layout.

### `searchService` scope

- index title + content + `lastInteractionText`
- fuzzy text ranking (no embeddings required in V2)
- return ranked note IDs

### Related notes (quiet suggestions)

Inside expanded note right rail, show 2–4 related cards based on:

- shared keywords
- recent co-activity
- overlapping interaction traces

Suggestions are optional and low-visual-weight. They never auto-open or rearrange anything.

## Pillar 2 — Context depth without clutter

### Attachments (lightweight)

Add optional note field:

```ts
attachments?: {
  id: string
  type: 'file' | 'image' | 'pdf'
  name: string
  path: string
}[]
```

Behavior:

- attach within expanded note
- compact inline preview
- collapsible section
- no document-manager affordances

### Link previews

For URLs:

- auto-fetch title
- optional snippet
- compact representation while note is collapsed

### Block quality upgrades

- checklist reorder + simple grouping
- syntax highlighting for code blocks
- improved multi-line/basic formatting editing

Keep block taxonomy constrained.

## Pillar 3 — Note intelligence, deliberately restrained

### Note-scoped AI panel

Placement: expanded note right rail, collapsible.

Supported actions:

- summarize note
- extract action items
- answer questions about note content
- compare note attachments

Hard constraints:

- no global AI chat
- no floating assistant
- no autonomous actions
- no rewrite/mutation without explicit user confirmation

Data flow must remain explicit:

```text
ExpandedNote → aiService → result → UI render
```

### Interaction trace upgrade

Improve interaction phrase extraction so card traces are recognizable and useful. Store output in `lastInteractionText` and trigger updates on:

- note edit
- checklist edits
- block interaction

## Pillar 4 — Gentle system hygiene

Extend lifecycle hints with non-coercive suggestions:

- `flagStaleAnchor(noteId)`
- `suggestArchive(noteId)`

These create prompts only. Never auto-archive, auto-unpin, or auto-move notes.

## Pillar 5 — Spatial enhancements (opt-in only)

### Manual auto-tidy

Provide `tidyCanvas()` (likely in workspace actions/layout utility):

- align cards
- normalize spacing
- preserve relative grouping

Must never run automatically.

### Soft grouping

Optional loose clusters/labels are acceptable if they avoid rigid containers and forced hierarchy.

## Pillar 6 — Performance and feel

Phase 2 baseline quality improvements:

- smoother drag interactions
- consistent animation timing
- faster startup
- reduced memory pressure

Likely tactics:

- memoized selectors
- virtualization only where necessary
- throttled persistence writes

Avoid premature complexity in caching and render abstractions.

## Store impact summary

### `notesStore`

- add attachment support
- improve interaction trace output

### `workspaceStore`

- minimal or no schema change

### `uiStore`

- search overlay state
- AI panel open/closed state

## Data flow integrity guardrail

Required pattern:

```text
User Action → Store Action → State Change → UI Render
```

Forbidden pattern:

```text
Background System → Silent Mutation → Surprise UI Change
```

## Integration checklist (apply before each Phase 2 feature)

- Does this preserve spatial memory?
- Does this avoid automatic rearrangement?
- Does this avoid adding persistent UI clutter?
- Does this keep user intent in control?
- Does this attach cleanly to existing models/stores?

If any answer is “no,” reject or defer.
