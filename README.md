# Atom Notes

Atom Notes V1 is now pivoted to a **desktop-first thinking surface** built with **Tauri + React + TypeScript**.

## Primary app (V1)

### Stack
- Tauri (desktop shell)
- React + TypeScript (UI)
- Vite (frontend tooling)

### Implemented V1 UI skeleton
- `ThinkingSurface`
- `RecallBand`
- `SpatialCanvas`
- `NoteCard`
- `ExpandedNote`
- `AnchorRow`
- `ArchiveView`
- `CaptureBox`

### Implemented interaction loop
- Double-tap `Ctrl` to summon/dismiss the thinking surface.
- `Ctrl+Shift+N` opens quick capture.
- Cards are draggable on a spatial canvas.
- Scene state is persisted/restored exactly via localStorage (`atom-notes-scene-v1`) including card positions, selection, active view, and capture visibility.

## Run instructions

### Frontend-only (fast iteration)
```bash
npm install
npm run dev
```

### Desktop app with Tauri
```bash
npm install
npm run tauri:dev
```

### Build
```bash
npm run build
npm run tauri:build
```

## Optional Python/domain scaffolding
If Python note-store utilities exist from earlier iterations, treat them only as optional local domain/storage references. They are **not** the primary V1 deliverable.

## Project structure
```text
.
├── index.html
├── package.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   ├── types.ts
│   └── components/
│       ├── AnchorRow.tsx
│       ├── ArchiveView.tsx
│       ├── CaptureBox.tsx
│       ├── ExpandedNote.tsx
│       ├── NoteCard.tsx
│       ├── RecallBand.tsx
│       ├── SpatialCanvas.tsx
│       └── ThinkingSurface.tsx
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── src/main.rs
│   └── capabilities/default.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```
