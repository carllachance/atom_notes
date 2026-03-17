# Atom Notes (Tauri + React + TypeScript)

A local-first spatial notes prototype with:
- ThinkingSurface shell
- RecallBand status header
- SpatialCanvas with draggable NoteCard items
- ExpandedNote editor
- CaptureBox quick capture
- ArchiveView restore flow
- Keyboard shortcuts:
  - Double-tap `Ctrl` to summon/dismiss capture box
  - `Ctrl+Shift+N` for quick capture
- Exact local scene persistence/restoration via `localStorage`

## Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start web-only dev mode:
   ```bash
   npm run dev
   ```
3. Start Tauri desktop dev mode:
   ```bash
   npm run tauri dev
   ```

## Build

```bash
npm run build
npm run tauri build
```
