# 1. Executive Summary

## What was implemented
- A local-first single-user note canvas with draggable note cards (`SpatialCanvas`, `NoteCard`) and a basic note modal (`ExpandedNote`).
- Basic note lifecycle actions: create (capture), edit, focus/open, archive, and restore.
- Persisted scene state in `localStorage` under `atom-notes.scene.v1`.
- A minimal recency/trace visual system (`trace.ts`) that changes labels and card rendering bias based on recent activity.

## What is partially implemented
- Modal foreground behavior exists, but only a light dim layer; no relationship web behind the modal.
- Time awareness exists only as recency-based visual bias and text labels, not as relationship lifecycle/ranking logic.
- Spatial memory is partially preserved through persisted note positions and canvas scroll offsets.

## What was not implemented
- No relationship graph model/entity.
- No relationship lifecycle state machine (`proposed`, `confirmed`, `active`, etc.).
- No explicit/inferred distinction for links.
- No explainability pipeline for inferred links.
- No graph ranking, intent-aware surfacing, uncertainty handling, epistemic modes, lenses, or review workflow.
- No collaboration/multi-user layer.

## Biggest architectural decisions made
- Keep all app state in a single `SceneState` object in `App.tsx` and mutate via local helper functions (no reducer/store abstraction).
- Use direct component callbacks (`onDrag`, `onOpen`, `onArchive`, etc.) instead of domain services.
- Persist the entire scene snapshot in browser `localStorage`, with manual normalization on load.

# 2. File-by-File Change Map

This section reflects the implemented feature set currently present in the repository.

## `src/App.tsx`
- **Why changed**: Hosts primary orchestration for scene state, persistence, view switching, capture, modal open/close, archive/restore, and keyboard shortcuts.
- **Key classes/functions/components**:
  - `SCENE_KEY`, `CTRL_DOUBLE_TAP_MS`
  - `makeStateCue`, `createNote`, `normalizeNote`, `loadScene`
  - `App` component
  - local mutators: `updateNote`, `bringToFront`, `setView`
- **Domain classification**: UI + state + persistence infrastructure.

## `src/types.ts`
- **Why changed**: Defines app state contracts for note cards and scene.
- **Key types**:
  - `WorkspaceView`
  - `NoteCardModel`
  - `SceneState`
- **Domain classification**: Data model/state.

## `src/components/SpatialCanvas.tsx`
- **Why changed**: Implements scrollable plane, drag interactions, pointer-based open threshold behavior.
- **Key items**:
  - `SpatialCanvas`
  - `DragState`
  - `OPEN_THRESHOLD_PX`
- **Domain classification**: UI + interaction infrastructure.

## `src/components/NoteCard.tsx`
- **Why changed**: Renders individual notes with style bias from trace metadata.
- **Key items**:
  - `NoteCard`
  - usage of `getTraceVisualBias`, `describeNoteTrace`
- **Domain classification**: UI.

## `src/components/ExpandedNote.tsx`
- **Why changed**: Implements modal editing/opened-note workflow.
- **Key items**:
  - `ExpandedNote`
- **Domain classification**: UI.

## `src/components/CaptureBox.tsx`
- **Why changed**: Implements quick-capture input workflow.
- **Key items**:
  - `CaptureBox`
  - local `commitCapture`
- **Domain classification**: UI + state.

## `src/components/RecallBand.tsx`
- **Why changed**: Top control band for counts, view toggle, and capture toggle.
- **Key items**:
  - `RecallBand`
- **Domain classification**: UI.

## `src/components/ArchiveView.tsx`
- **Why changed**: Archive list view and restore flow.
- **Key items**:
  - `ArchiveView`
- **Domain classification**: UI.

## `src/trace.ts`
- **Why changed**: Computes trace labels and recency-driven visual bias values.
- **Key items**:
  - `semanticTrace`, `getTraceVisualBias`, `describeNoteTrace`
  - `TRACE_LABELS`, `TraceVisualBias`, `clamp`
- **Domain classification**: Time/visual heuristic logic.

## `src/styles.css`
- **Why changed**: Entire visual treatment, including modal shell, canvas, cards, and archive/capture styling.
- **Key items**:
  - `.expanded-note-shell`, `.expanded-note`
  - `.spatial-canvas`, `.note-card`, `.view-stack`
- **Domain classification**: UI rendering/style infrastructure.

## `src/components/ThinkingSurface.tsx`
- **Why changed**: Layout wrapper.
- **Key items**: `ThinkingSurface`
- **Domain classification**: UI infrastructure.

## `src/components/AnchorRow.tsx`
- **Why changed**: Provides anchor-chip rendering utility component.
- **Key items**: `AnchorRow`
- **Domain classification**: UI (currently not integrated into the main flow).

# 3. Data Model and State

## Entities, types, and fields

### `NoteCardModel`
- **Purpose**: Represents a single note in the canvas/archive system.
- **Important fields**:
  - identity/content: `id`, `title`, `body`
  - lightweight metadata: `anchors`, `trace`, `stateCue`
  - spatial: `x`, `y`, `z`
  - temporal: `createdAt`, `updatedAt`
  - archive flag: `archived`
- **Lifecycle/transitions**:
  - Created via `createNote`
  - Updated via `updateNote`
  - Opened/focused via `onOpen` -> `trace='focused'`
  - Archived/restored via `onArchive`/`onRestore`
- **Model fidelity**: Simplification relative to target model (missing `note_type`, `workspace_id`, `project_ids`, `last_viewed_at`, `status`, and no relationship references).

### `SceneState`
- **Purpose**: Entire in-memory scene snapshot.
- **Important fields**:
  - `notes`, `activeNoteId`, `quickCaptureOpen`, `lastCtrlTapTs`, `currentView`, `canvasScrollLeft`, `canvasScrollTop`
- **Lifecycle/transitions**:
  - Initialized by `loadScene`
  - Persisted after each state mutation via `useEffect`
- **Model fidelity**: Simplified single-store state, no reducer granularity, no domain sub-stores (graph/intent/review).

### `WorkspaceView`
- **Purpose**: Controls primary view mode.
- **Enum values**: `'canvas' | 'archive'`
- **Model fidelity**: Minimal; no graph/history/epistemic mode states.

## State containers/hooks/reducers
- **Present**:
  - `useState<SceneState>` in `App`
  - `useMemo` for active note derivation
  - `useEffect` for persistence and keyboard bindings
- **Absent**:
  - reducers
  - explicit stores
  - graph caches/services
  - intent/uncertainty/review state machines

## Persisted fields
- Persisted JSON payload under `localStorage['atom-notes.scene.v1']`:
  - all `SceneState` fields, including complete note records.

# 4. Relationship System

## Current implementation status
- There is **no relationship entity** and **no relationship rendering pipeline**.
- There are no typed relationship kinds (e.g., `task_dependency`, `references`, `related_concept`).
- No lifecycle states (`proposed`, `confirmed`, `active`, `cooling`, `historical`, etc.) exist.
- No explicit vs inferred representation exists.
- No reinforcement/decay for relationships exists.
- No explainability field or tooltip for inferred links exists.

## What exists that is adjacent
- `trace` on notes captures note-level activity labels (`captured`, `moved`, `focused`, `refined`, etc.), but this is **not** a relationship system.

# 5. Ranking and Selection Logic

## Implemented logic
- No relationship ranking engine exists.
- No intent-aware ranking exists.
- No uncertainty penalty logic exists.
- No attention budget for node/edge surfacing exists.
- No suggestion ranking exists.

## Existing heuristics (non-relationship)
- `semanticTrace` label selection based on `updatedAt` age buckets.
- `getTraceVisualBias` computes style values (`scale`, `opacity`, `blur`, `lift`) from note recency and note trace type.
- `OPEN_THRESHOLD_PX = 6` distinguishes click-to-open vs drag movement.

# 6. Modal and Graph Rendering

## Modal open flow
- User pointer-up on a card with movement below threshold triggers `onOpen(id)`.
- `App` sets `activeNoteId` and updates note trace to `focused`.
- `ExpandedNote` renders when `activeNoteId` resolves to a note.

## Background dimming behavior
- Implemented by `.expanded-note-shell` with translucent background and light blur.

## Graph rendering pipeline
- Not implemented.

## First-degree vs second-degree logic
- Not implemented.

## Node/edge caps
- Not implemented.

## Visual encoding rules
- Relationship edge color/style semantics are not implemented.
- Current encoding is note-card recency/trace styling only.

## Animation timing
- CSS transitions exist for note cards and view layers; no staged modal+graph reveal sequence exists.

## Spatial memory/layout behavior
- Preserved for note positions (`x`,`y`) and canvas scroll offsets.
- No graph spatial memory behavior exists.

# 7. Intent, Lenses, and Epistemic Modes

## Intent inference
- Not implemented.

## Lenses and composition
- Not implemented.

## Epistemic modes
- Not implemented.

## Uncertainty tolerance/mode alignment
- Not implemented.

## Closest existing concept
- `currentView` (`canvas`/`archive`) is a basic UI mode switch, not an intent/epistemic system.

# 8. Workflow Suggestions and Review

## Suggestion classes
- None implemented.

## Suggestion lifecycle
- None implemented.

## Review item types/triggers
- None implemented.

## Approval/rejection flows
- None implemented.

## Safety checks/policy guards
- None implemented beyond basic input handling.

# 9. Collaboration / Multi-User Support

## Exists
- No collaboration or multi-user support.

## Scaffolded
- No explicit scaffolding for shared cognition/team state.

## Not present
- Shared workspaces, user identity, conflict resolution for concurrent edits, multiplayer graph overlays, or presence indicators.

# 10. Performance and Caching

## Implemented
- Lightweight local render with React state.
- No heavy graph simulation.
- `useMemo` for active-note lookup.
- Scroll position persistence to avoid manual relocation after reload.

## Not implemented
- Relationship neighbor caching.
- Ranked precomputation.
- Lazy loading of second-degree graph neighborhoods.
- Hover debouncing for graph interactions.

## Expensive paths / risks
- Whole-scene persistence (`JSON.stringify(scene)`) runs on every scene mutation.
- Full notes array remap in `updateNote` and `bringToFront` for each mutation.
- No virtualization for large note counts.

# 11. Deviations from Spec

1. **Core relationship model absent**
- Intended: explicit `Relationship` entity with type/lifecycle/confidence/provenance.
- Actual: no relationship entity; only note-level trace metadata.
- Why: current implementation appears scoped to basic note canvas and modal CRUD.
- Severity: **high**.

2. **No local relationship web behind modal**
- Intended: modal foreground + faint first/second-degree web with strict caps.
- Actual: modal opens with dim backdrop only.
- Why: graph renderer/data services were not implemented.
- Severity: **high**.

3. **No lifecycle state machine compliance**
- Intended: strict transitions among `proposed`, `confirmed`, `active`, etc.
- Actual: no relationship lifecycle state exists.
- Why: missing relationship system.
- Severity: **high**.

4. **No explicit vs inferred distinction**
- Intended: visual and logical separation plus explainability.
- Actual: not represented in data or UI.
- Why: missing relationship model.
- Severity: **high**.

5. **No intent-aware surfacing**
- Intended: session-scoped intent context and ranking modulation.
- Actual: no intent collector/context/scoring components.
- Why: not yet built.
- Severity: **high**.

6. **No uncertainty/review pipeline**
- Intended: uncertainty-aware ranking, suggestions, review/approval flows.
- Actual: no uncertainty or review primitives.
- Why: not yet built.
- Severity: **high**.

7. **Modal filtering strip absent**
- Intended: Sources/Tasks/Related/History/Conflicts strip with hover highlighting.
- Actual: modal has title/body and Archive/Back actions only.
- Why: modal remains minimal CRUD editor.
- Severity: **medium-high**.

8. **Ontology and semantic encoding incomplete**
- Intended: fixed relationship ontology and edge color/style semantics.
- Actual: no relationship edge rendering.
- Why: missing graph features.
- Severity: **high**.

9. **Performance contract not validated for graph operations**
- Intended: <100ms first-degree render, <400ms full reveal.
- Actual: graph path absent; no related benchmarks.
- Why: graph path absent.
- Severity: **medium**.

# 12. Known Risks and Technical Debt

- **Monolithic state orchestration in `App.tsx`**: high coupling among UI actions, persistence, keyboard shortcuts, and business behavior.
- **No domain-layer boundaries**: ranking/time logic, if added later, risks being embedded directly in components.
- **Stringly-typed `trace` values**: no enum guardrails can lead to drift and typo bugs.
- **Scalability risk**: array remap updates and full snapshot persistence may become costly with large note counts.
- **Feature drift risk**: current data model is too narrow to naturally evolve into required relationship lifecycle/intent architecture without refactor.

# 13. Alignment Self-Assessment

Scored against the doctrine in AGENTS.md (1-10):

- **calm UI / low clutter: 8/10**
  - Minimal controls and subdued styling are present.
- **hidden but rigorous structure: 3/10**
  - Hidden structure is minimal and not graph-rigorous.
- **relationship lifecycle correctness: 1/10**
  - Lifecycle system absent.
- **uncertainty-aware behavior: 1/10**
  - No uncertainty primitives.
- **intent-aware surfacing: 1/10**
  - No intent subsystem.
- **review safety: 1/10**
  - No suggestion/review pipeline.
- **explainability: 2/10**
  - Simple trace labels exist, but no relationship explainability.
- **performance discipline: 6/10**
  - Lightweight UI, but lacks scaling controls and graph-specific optimization.
- **architectural cleanliness: 5/10**
  - Readable code, but responsibilities are centralized in `App`.
- **faithfulness to AGENTS.md: 3/10**
  - Visual calmness aligns somewhat; core relationship, lifecycle, intent, and trust requirements largely unimplemented.

# 14. Verification Appendix

## Exact commands to inspect implementation

```bash
pwd
rg --files -g 'AGENTS.md'
rg --files src
sed -n '1,320p' src/App.tsx
sed -n '1,260p' src/types.ts
sed -n '1,260p' src/components/SpatialCanvas.tsx
sed -n '1,220p' src/components/ExpandedNote.tsx
sed -n '1,320p' src/trace.ts
sed -n '1,340p' src/styles.css
```

## Key files to read first
1. `src/App.tsx` (state and orchestration)
2. `src/types.ts` (data model)
3. `src/components/SpatialCanvas.tsx` (interaction model)
4. `src/components/ExpandedNote.tsx` (modal behavior)
5. `src/trace.ts` (time-ish visual heuristics)
6. `src/styles.css` (visual behavior)

## Key tests/checks to run
- `npm run build` (type-check + production compile validation)
- `npm run lint` (if configured)

## Screenshots/manual flows to verify
- Manual flow 1: create note in capture box, confirm card appears with default state cue.
- Manual flow 2: drag note, verify position persists after reload.
- Manual flow 3: open note modal, confirm dim background and edit persistence.
- Manual flow 4: archive + restore, verify state transitions and view switching.
- Manual flow 5: validate that no relationship web appears (documented gap vs target spec).
