# Atomic Notes (atom_notes)

### One shared universe. Calm capture. Grounded AI.

Atomic Notes is a local-first note canvas where every note lives in one shared universe.
Projects, workspaces, reveal queries, Focus, and AI exploration are all scoped views over the same graph rather than separate silos.

## Mental model

### Shared universe
- Notes are not trapped in isolated boards.
- Projects are clusters.
- Workspaces are scope/origin metadata.
- Reveal is a relationship-aware lens.
- Focus is a user-controlled visibility layer, not a different data store.

### Capture first
- Double-tap `Ctrl` opens the capture composer.
- `Enter` adds a newline.
- `Ctrl+Enter` commits.
- The first non-empty line becomes the title.
- The rest becomes the body.
- New notes are placed near the current canvas center with deterministic overlap avoidance.

### Focus without ambiguity
- Focus notes are visibly badged on the canvas.
- `Highlight Focus` emphasizes them.
- `Focus only` isolates them.
- The UI shows the current Focus count so the behavior is explicit.

### Grounded AI
The right-side Insights panel is not a generic chatbot.
It is grounded in:
- the selected note
- visible notes
- active project scope
- graph relationships
- recent capture context

Modes:
- Ask
- Explore
- Summarize
- Act

The Insights surface now behaves as a slim rail:
- one toggle expands/collapses the rail
- compact mode buttons stay visible when collapsed
- labels appear on hover or stay inline when expanded
- active mode remains visually distinct without adding a second row of state controls

## Core domain

### Notes
Each note can now carry:
- optional intent classification (`task`, `link`, `code`, `note`)
- intent confidence
- Focus state
- explicit project membership
- inferred project membership suggestions
- inferred relationship suggestions
- workspace affinity

### Relationships
Supported relationship types:
- `related`
- `references`
- `depends_on`
- `supports`
- `contradicts`
- `part_of`
- `leads_to`
- `derived_from`

Relationships preserve:
- directionality
- inferred vs explicit status
- confidence
- explanation
- recency

When a note is open:
- the modal uses a content-first layout on wide screens
- relationships stay summary-first in `All` view
- selecting a relationship type reveals only that slice
- in-place relationship editing preserves the existing relationship record and supports undo

### Lenses
Persisted lenses:
- `universe`
- `project`
- `workspace`
- `reveal`
- `archive`

Lens rules are centralized in selector/state logic so the graph stays singular while perspective changes.

## What exists today
- shared-universe lens architecture
- persisted workspace and project metadata
- capture composer overlay with multiline input and commit/cancel behavior
- inferred title/body split on capture
- deterministic smart placement for new notes
- soft post-capture edit flow via immediate modal open
- undo for the last capture
- async note intent / project / relationship suggestion inference
- expanded relationship ontology and visuals
- Focus highlight + isolate controls
- slim right-side Insights rail with compact mode switching
- graph-first Connected Insights service with references and action chips
- confirmation flow for mutating AI actions
- content-first note detail layout with summary-first relationship disclosure

## Development

### Install
```bash
npm install
```

### Run
```bash
npm run tauri dev
```

### Prototype demo route
```bash
npm install
npm run dev
```
Then open `http://localhost:5173/query-prototype` to launch the isolated query-layer prototype without changing the default app flow.

The prototype lives in `src/prototypes/QueryLayerPrototype.tsx` with mocked data isolated in `src/prototypes/queryLayerPrototype.mock.ts`. The mocked layer currently stands in for:
- note search results
- relationship previews
- project/focus metadata

Next steps to connect it to the real store:
- replace the mock item list with ranked note search results from the scene/store
- swap relationship preview data for live graph relationships and explainability metadata
- feed real project, focus, and workspace context into the detail panel

### Validate
```bash
npm test
npm run build
```

### Planning artifact
- Product planning artifact: `docs/codex_epics_and_stories.json`
- Discern design brief (March 25, 2026): `docs/DISCERN_DESIGN_BRIEF_2026-03-25.md`
- UI implementation rules addendum: `docs/UI_RULES_ADDENDUM.md`
- External review reconciliation (March 25, 2026): `docs/EXTERNAL_REVIEW_RECONCILIATION_2026-03-25.md`
- Mobile modal surface recommendation: `docs/MOBILE_MODAL_SURFACE_RECOMMENDATION.md`

## Direction
Atomic Notes is being shaped around three principles:
- calm capture
- explainable structure
- assistive, grounded intelligence

The interface should still feel quiet.
The underlying system should keep getting more graph-aware, reversible, and trustworthy.
