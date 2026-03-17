import { useEffect, useMemo, useState } from 'react';
import { ArchiveView } from './components/ArchiveView';
import { CaptureBox } from './components/CaptureBox';
import { ExpandedNote } from './components/ExpandedNote';
import { RecallBand } from './components/RecallBand';
import { SpatialCanvas } from './components/SpatialCanvas';
import { ThinkingSurface } from './components/ThinkingSurface';
import { NoteCardModel, SceneState, WorkspaceView } from './types';

const SCENE_KEY = 'atom-notes.scene.v1';
const CTRL_DOUBLE_TAP_MS = 320;

const now = () => Date.now();

function makeStateCue(note: Pick<NoteCardModel, 'archived' | 'anchors'>): string {
  if (note.archived) return 'Resting';
  if (note.anchors.length > 0) return `Anchored · ${note.anchors.length}`;
  return 'Open loop';
}

function createNote(text: string, z: number): NoteCardModel {
  const t = now();
  const trimmed = text.trim();
  const title = trimmed.split('\n')[0] || 'Quick note';
  const base = {
    id: crypto.randomUUID(),
    title,
    body: trimmed,
    anchors: [],
    trace: 'captured',
    stateCue: 'Open loop',
    x: 80 + (z % 8) * 32,
    y: 100 + (z % 6) * 28,
    z,
    createdAt: t,
    updatedAt: t,
    archived: false
  } satisfies NoteCardModel;
  return { ...base, stateCue: makeStateCue(base) };
}

function normalizeNote(note: Partial<NoteCardModel>, i: number): NoteCardModel {
  const parsed: NoteCardModel = {
    id: String(note.id ?? `legacy-${i}`),
    title: String(note.title ?? 'Quick note'),
    body: String(note.body ?? ''),
    anchors: Array.isArray(note.anchors) ? note.anchors.map(String) : [],
    trace: String(note.trace ?? 'idle'),
    stateCue: String(note.stateCue ?? 'Open loop'),
    x: Number(note.x ?? 80),
    y: Number(note.y ?? 100),
    z: Number(note.z ?? i + 1),
    createdAt: Number(note.createdAt ?? now()),
    updatedAt: Number(note.updatedAt ?? now()),
    archived: Boolean(note.archived)
  };

  return { ...parsed, stateCue: makeStateCue(parsed) };
}

function loadScene(): SceneState {
  const fallback: SceneState = {
    notes: [createNote('Welcome to Atom Notes\nDrag this card around.', 1)],
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    currentView: 'canvas',
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };

  const raw = localStorage.getItem(SCENE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<SceneState>;
    const normalizedNotes = Array.isArray(parsed.notes)
      ? parsed.notes.map((note, i) => normalizeNote(note as Partial<NoteCardModel>, i))
      : fallback.notes;

    const requestedView = parsed.currentView === 'archive' ? 'archive' : 'canvas';
    const activeNoteId =
      typeof parsed.activeNoteId === 'string' && normalizedNotes.some((note) => note.id === parsed.activeNoteId)
        ? parsed.activeNoteId
        : null;

    return {
      notes: normalizedNotes,
      activeNoteId,
      quickCaptureOpen: Boolean(parsed.quickCaptureOpen),
      lastCtrlTapTs: Number(parsed.lastCtrlTapTs ?? 0),
      currentView: requestedView,
      canvasScrollLeft: Number(parsed.canvasScrollLeft ?? 0),
      canvasScrollTop: Number(parsed.canvasScrollTop ?? 0)
    };
  } catch {
    return fallback;
  }
}

export function App() {
  const [scene, setScene] = useState<SceneState>(loadScene);
  const [, setTraceClock] = useState(0);

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
    const timer = window.setInterval(() => setTraceClock((tick) => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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

  const updateNote = (id: string, updates: Partial<NoteCardModel>, trace?: string) => {
    setScene((prev) => ({
      ...prev,
      notes: prev.notes.map((note) => {
        if (note.id !== id) return note;
        const next = {
          ...note,
          ...updates,
          trace: trace ?? updates.trace ?? note.trace,
          updatedAt: now()
        };
        return { ...next, stateCue: makeStateCue(next) };
      })
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
              trace: 'moved',
              updatedAt: now()
            }
          : note
      )
    }));
  };

  const setView = (view: WorkspaceView) => {
    setScene((prev) => ({ ...prev, currentView: view }));
  };

  return (
    <ThinkingSurface>
      <RecallBand
        count={activeNotes.length}
        archivedCount={archivedNotes.length}
        quickCaptureOpen={scene.quickCaptureOpen}
        currentView={scene.currentView}
        onSetView={setView}
        onToggleQuickCapture={() =>
          setScene((prev) => ({ ...prev, quickCaptureOpen: !prev.quickCaptureOpen }))
        }
      />

      <section className="view-stack" data-view={scene.currentView}>
        <div className="view-layer view-layer-canvas">
          <SpatialCanvas
            notes={activeNotes}
            initialScrollLeft={scene.canvasScrollLeft}
            initialScrollTop={scene.canvasScrollTop}
            onScroll={(left, top) =>
              setScene((prev) =>
                prev.canvasScrollLeft === left && prev.canvasScrollTop === top
                  ? prev
                  : { ...prev, canvasScrollLeft: left, canvasScrollTop: top }
              )
            }
            onDrag={(id, x, y) => updateNote(id, { x, y }, 'moved')}
            onOpen={(id) => {
              setScene((prev) => ({ ...prev, activeNoteId: id }));
              updateNote(id, {}, 'focused');
            }}
            onBringToFront={bringToFront}
          />
        </div>

        <div className="view-layer view-layer-archive">
          <ArchiveView
            notes={archivedNotes}
            onRestore={(id) => {
              updateNote(id, { archived: false, z: highestZ + 1 }, 'restored');
              setScene((prev) => ({ ...prev, currentView: 'canvas' }));
            }}
          />
        </div>
      </section>

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
        onChange={(id, updates) => {
          const trace = updates.title || updates.body ? 'refined' : 'idle';
          updateNote(id, updates, trace);
        }}
        onArchive={(id) => {
          updateNote(id, { archived: true }, 'archive');
          setScene((prev) => ({ ...prev, activeNoteId: null, currentView: 'archive' }));
        }}
      />
    </ThinkingSurface>
  );
}
