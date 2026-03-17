import { useEffect, useMemo, useState } from 'react';
import { AnchorRow } from '../components/shell/AnchorRow';
import { ArchiveView } from '../components/shell/ArchiveView';
import { SpatialCanvas } from '../components/canvas/SpatialCanvas';
import { CaptureBox } from '../components/notes/CaptureBox';
import { RecallBand } from '../components/shell/RecallBand';
import { ExpandedNote } from '../components/notes/ExpandedNote';
import { useDoubleTapCtrl } from '../hooks/useDoubleTapCtrl';
import { useQuickCapture } from '../hooks/useQuickCapture';
import { Note } from '../models/note';
import { WorkspaceState } from '../models/workspace';
import { persistenceService } from '../services/persistenceService';
import { workspaceRestoreService } from '../services/workspaceRestoreService';
import { createNote, updateNoteText } from '../state/notesStore';
import { defaultWorkspaceState } from '../state/workspaceStore';

const restoreWorkspace = (): WorkspaceState => workspaceRestoreService.restore(defaultWorkspaceState);

export const App = () => {
  const [notes, setNotes] = useState<Note[]>(() => persistenceService.loadNotes());
  const [workspace, setWorkspace] = useState<WorkspaceState>(restoreWorkspace);

  const archivedNotes = useMemo(() => notes.filter((note) => note.archived), [notes]);
  const activeNotes = useMemo(() => notes.filter((note) => !note.archived && !note.pinned), [notes]);
  const anchoredNotes = useMemo(() => notes.filter((note) => !note.archived && note.pinned), [notes]);

  useEffect(() => persistenceService.saveNotes(notes), [notes]);
  useEffect(() => workspaceRestoreService.snapshot(workspace), [workspace]);

  const toggleSummonDismiss = () => {
    setWorkspace((current) => {
      if (current.mode === 'ACTIVE') return { ...current, mode: 'DISMISSED' };
      return { ...workspaceRestoreService.restore(current), mode: 'ACTIVE' };
    });
  };

  useDoubleTapCtrl(toggleSummonDismiss);
  useQuickCapture(() => setWorkspace((state) => ({ ...state, captureBoxOpen: true })));

  const createFromCapture = (text: string, expand: boolean) => {
    if (!text) {
      setWorkspace((state) => ({ ...state, captureBoxOpen: false }));
      return;
    }
    const note = createNote(text);
    setNotes((prev) => [...prev, note]);
    setWorkspace((state) => ({
      ...state,
      captureBoxOpen: false,
      cardPositions: { ...state.cardPositions, [note.id]: { x: 120, y: 180 } },
      expandedNoteIds: expand ? [...state.expandedNoteIds, note.id] : state.expandedNoteIds,
      focusedNoteId: expand ? note.id : state.focusedNoteId,
    }));
  };

  return (
    <div className="app-root">
      {workspace.mode === 'DISMISSED' ? (
        <RecallBand notes={notes.filter((note) => !note.archived)} />
      ) : (
        <>
          <header className="topbar">
            <h1>Clarify the Complex</h1>
            <button onClick={() => setWorkspace((state) => ({ ...state, archiveViewOpen: !state.archiveViewOpen }))}>
              {workspace.archiveViewOpen ? 'Back to Surface' : 'Open Archive'}
            </button>
          </header>
          {workspace.archiveViewOpen ? (
            <ArchiveView
              notes={archivedNotes}
              onRestore={(id) => setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, archived: false } : note)))}
            />
          ) : (
            <>
              <AnchorRow notes={anchoredNotes} onOpen={(id) => setWorkspace((state) => ({ ...state, expandedNoteIds: [...new Set([...state.expandedNoteIds, id])] }))} />
              <SpatialCanvas
                notes={activeNotes}
                positions={workspace.cardPositions}
                onOpen={(id) => setWorkspace((state) => ({ ...state, expandedNoteIds: [...new Set([...state.expandedNoteIds, id])], focusedNoteId: id }))}
                onPin={(id) => setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note)))}
                onArchive={(id) => setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, archived: true, pinned: false } : note)))}
                onDrag={(id, x, y) => setWorkspace((state) => ({ ...state, cardPositions: { ...state.cardPositions, [id]: { x, y } } }))}
              />
              {workspace.expandedNoteIds.map((noteId) => {
                const note = notes.find((entry) => entry.id === noteId);
                if (!note || note.archived) return null;
                return (
                  <ExpandedNote
                    key={noteId}
                    note={note}
                    onClose={() => setWorkspace((state) => ({ ...state, expandedNoteIds: state.expandedNoteIds.filter((id) => id !== noteId) }))}
                    onUpdate={(value) => setNotes((prev) => prev.map((entry) => (entry.id === noteId ? updateNoteText(entry, value) : entry)))}
                  />
                );
              })}
            </>
          )}
          {workspace.captureBoxOpen && (
            <CaptureBox onSubmit={createFromCapture} onClose={() => setWorkspace((state) => ({ ...state, captureBoxOpen: false }))} />
          )}
        </>
      )}
    </div>
  );
};
