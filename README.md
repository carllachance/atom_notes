# Atomic Notes

Atomic Notes is a local-first thinking surface built around one shared universe of notes.

Instead of splitting ideas into isolated boards, the app treats every note as part of the same relational system and uses lenses to decide what to emphasize right now.

## Updated mental model

### One universe, many lenses

Notes do not live inside exclusive silos.

Each note can carry:

- an **origin workspace** (`workspaceId`)
- additional **workspace affinities** (`workspaceAffinities`)
- zero or more **project memberships** (`projectIds`)

That metadata helps the system focus the canvas without turning workspace into a prison.

### Workspaces are scope, not containment

A workspace lens answers:

> “What should I emphasize from this scope right now?”

It does **not** mean:

> “Hide everything that was born elsewhere forever.”

Because notes can have affinities beyond their origin, a workspace view can include shared notes while still showing where they came from.

### Projects span scopes

A project lens can gather notes from multiple workspaces.

This keeps the canvas aligned to the work at hand while preserving origin cues for cross-scope notes.

### Reveal searches the shared universe

Reveal is now a real lens, not just a temporary highlight.

A reveal query searches across the full note universe and can surface off-scope matches. Those surfaced notes stay visibly marked with scope context so cross-workspace discovery remains explainable.

### Relationship reveal stays local and calm

Opening a note still reveals its local relationship web behind the modal.

That relationship neighborhood is treated as a formal reveal lens in state/selectors so the rules for visibility, context, and off-scope surfacing stay centralized instead of being scattered across components.

## Current lens types

The app currently supports these lens families:

- **Workspace lens** — focus on a workspace or the shared universe
- **Project lens** — focus on one project across scopes
- **Reveal lens** — surface notes by query or local relationships
- **Archive lens** — inspect historical notes without mixing them into the active canvas

## Key behavior guarantees

- The active lens is shown in the UI.
- Workspace metadata focuses the canvas without exclusive containment.
- Cross-workspace reveal can surface relevant notes.
- Off-scope surfaced notes keep visible context cues.
- Lens rules live in centralized selectors/state.
- Lens state is serialized with the scene.

## Development

### Prerequisites

- Node.js (LTS)
- npm

### Commands

```bash
npm install
npm test
npm run build
npm run dev
```
