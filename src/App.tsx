import { useEffect, useMemo, useState } from 'react';
import { ArchiveView } from './components/ArchiveView';
import { CaptureBox } from './components/CaptureBox';
import { ExpandedNote } from './components/ExpandedNote';
import { RecallBand } from './components/RecallBand';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { NoteCardModel, SceneState } from './types';

const SCENE_KEY = 'atom-notes.scene.v1';
const CTRL_DOUBLE_TAP_MS = 320;

const now = () => Date.now();

function createNote(text: string, z: number): NoteCardModel {
  const t = now();
  const trimmed = text.trim();
  const title = trimmed.split('\n')[0] || 'Quick note';
  return {
    id: crypto.randomUUID(),
    title,
    body: trimmed,
    anchors: [],
    x: 80 + (z % 8) * 32,
    y: 100 + (z % 6) * 28,
    z,
    createdAt: t,
    updatedAt: t,
    archived: false
  };
}

function loadScene(): SceneState {
  const fallback: SceneState = {
    notes: [createNote('Welcome to Atom Notes\nDrag this card around.', 1)],
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0
  };

  const raw = localStorage.getItem(SCENE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as SceneState;
    if (!Array.isArray(parsed.notes)) return fallback;
    return {
      notes: parsed.notes,
      activeNoteId: parsed.activeNoteId ?? null,
      quickCaptureOpen: Boolean(parsed.quickCaptureOpen),
      lastCtrlTapTs: Number(parsed.lastCtrlTapTs ?? 0)
    };
  } catch {
    return fallback;
  }
}

export function App() {
  const [scene, setScene] = useState<SceneState>(loadScene);

  const activeNote = useMemo(
    () => scene.notes.find((note) => note.id === scene.activeNoteId) ?? null,
    [scene.activeNoteId, scene.notes]
  );

  const activeNotes = scene.notes.filter((note) => !note.archived);
  const archivedNotes = scene.notes.filter((note) => note.archived);
  const highestZ = scene.notes.reduce((acc, note) => Math.max(acc, note.z), 0);

  useEffect(() => {
    localStorage.setItem(SCENE_KEY, JSON.stringify(scene));
  }, [scene]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        const t = now();
        if (t - scene.lastCtrlTapTs <= CTRL_DOUBLE_TAP_MS) {
          setScene((prev) => ({
            ...prev,
            quickCaptureOpen: !prev.quickCaptureOpen,
            lastCtrlTapTs: 0
          }));
        } else {
          setScene((prev) => ({ ...prev, lastCtrlTapTs: t }));
        }
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setScene((prev) => ({ ...prev, quickCaptureOpen: true }));
      }

      if (event.key === 'Escape') {
        setScene((prev) => ({ ...prev, activeNoteId: null }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scene.lastCtrlTapTs]);

  const updateNote = (id: string, updates: Partial<NoteCardModel>) => {
    setScene((prev) => ({
      ...prev,
      notes: prev.notes.map((note) =>
        note.id === id
          ? {
              ...note,
              ...updates,
              updatedAt: now()
            }
          : note
      )
    }));
  };

  const bringToFront = (id: string) => {
    setScene((prev) => ({
      ...prev,
      notes: prev.notes.map((note) =>
        note.id === id
          ? {
              ...note,
              z: prev.notes.reduce((acc, n) => Math.max(acc, n.z), 0) + 1,
              updatedAt: now()
            }
          : note
      )
    }));
  };

  return (
    <ThinkingSurface>
      <RecallBand
        count={activeNotes.length}
        archivedCount={archivedNotes.length}
        quickCaptureOpen={scene.quickCaptureOpen}
        onToggleQuickCapture={() =>
          setScene((prev) => ({ ...prev, quickCaptureOpen: !prev.quickCaptureOpen }))
        }
      />

      <SpatialCanvas
        notes={activeNotes}
        onDrag={(id, x, y) => updateNote(id, { x, y })}
        onOpen={(id) => setScene((prev) => ({ ...prev, activeNoteId: id }))}
        onBringToFront={bringToFront}
      />

      <CaptureBox
        isOpen={scene.quickCaptureOpen}
        onCapture={(text) => {
          setScene((prev) => ({
            ...prev,
            notes: [...prev.notes, createNote(text, highestZ + 1)]
          }));
        }}
      />

      <ExpandedNote
        note={activeNote}
        onClose={() => setScene((prev) => ({ ...prev, activeNoteId: null }))}
        onChange={(id, updates) => updateNote(id, updates)}
        onArchive={(id) => {
          updateNote(id, { archived: true });
          setScene((prev) => ({ ...prev, activeNoteId: null }));
        }}
      />

      <ArchiveView
        notes={archivedNotes}
        onRestore={(id) => updateNote(id, { archived: false, z: highestZ + 1 })}
      />
    </ThinkingSurface>
  );
}
