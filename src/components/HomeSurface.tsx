import { useState } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { NoteCardModel } from '../types';

type HomeSurfaceProps = {
  draft: string;
  notes: NoteCardModel[];
  deletedNotes: NoteCardModel[];
  lastCreatedNoteId: string | null;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onOpenNote: (noteId: string) => void;
  onOpenCaptureComposer: () => void;
  onRestoreDeletedNote: (noteId: string) => void;
};

type SurfaceNote = NoteCardModel & {
  kicker: string;
};

function summarizeOpenWork(notes: NoteCardModel[]): SurfaceNote[] {
  return notes
    .filter((note) => !note.archived && !note.deleted && note.intent === 'task' && note.taskState !== 'done')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3)
    .map((note) => ({ ...note, kicker: 'Open task' }));
}

function summarizeRecentNotes(notes: NoteCardModel[], lastCreatedNoteId: string | null): SurfaceNote[] {
  return notes
    .filter((note) => !note.archived && !note.deleted)
    .sort((a, b) => {
      if (a.id === lastCreatedNoteId) return -1;
      if (b.id === lastCreatedNoteId) return 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 4)
    .map((note, index) => ({
      ...note,
      kicker: note.id === lastCreatedNoteId ? 'Latest capture' : index === 0 ? 'Recent note' : 'Recently touched'
    }));
}

export function HomeSurface({
  draft,
  notes,
  deletedNotes,
  lastCreatedNoteId,
  onDraftChange,
  onCommit,
  onOpenNote,
  onOpenCaptureComposer,
  onRestoreDeletedNote
}: HomeSurfaceProps) {
  const [showOverview, setShowOverview] = useState(false);
  const openWork = summarizeOpenWork(notes);
  const recentNotes = summarizeRecentNotes(notes, lastCreatedNoteId);

  return (
    <section className="home-surface home-surface--light" aria-label="Quick start surface">
      <div className="home-surface__capture home-surface__capture--compact">
        <div className="home-surface__capture-head">
          <div>
            <span className="home-surface__eyebrow">Quick capture</span>
            <h1>Start with the next note.</h1>
            <p>Capture first, then open overview only when you need more context.</p>
          </div>
          <button type="button" className="ghost-button" onClick={() => setShowOverview((current) => !current)}>
            {showOverview ? 'Hide overview' : 'Show overview'}
          </button>
        </div>
        <label className="home-surface__capture-label" htmlFor="home-capture">
          Capture anything messy
        </label>
        <textarea
          id="home-capture"
          placeholder="Write naturally. The first line becomes the title."
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <div className="home-surface__capture-actions">
          <button type="button" className="ghost-button" onClick={onOpenCaptureComposer}>
            Full capture
          </button>
          <button type="button" onClick={onCommit} disabled={!draft.trim()}>
            Capture note
          </button>
        </div>
      </div>

      {deletedNotes.length ? (
        <section className="home-surface__panel" aria-label="Recently deleted notes">
          <div className="home-surface__panel-head">
            <div>
              <strong>Recently deleted</strong>
              <p>Trash stays reversible. Restore a note with its links intact.</p>
            </div>
            <span>{deletedNotes.length} in trash</span>
          </div>
          <div className="home-surface__list">
            {deletedNotes.slice(0, 3).map((note) => (
              <div key={note.id} className="home-surface__note-row home-surface__note-row--static">
                <div>
                  <small>Deleted</small>
                  <strong>{getCompactDisplayTitle(note, 42)}</strong>
                  <p>{getSummaryPreview(note, 92)}</p>
                </div>
                <button type="button" className="ghost-button" onClick={() => onRestoreDeletedNote(note.id)}>
                  Restore
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showOverview ? (
        <div className="home-surface__sections">
          <section className="home-surface__panel" aria-label="Needs attention">
            <div className="home-surface__panel-head">
              <div>
                <strong>Needs attention</strong>
                <p>Active tasks stay close without turning this into a dashboard.</p>
              </div>
              <span>{openWork.length} open</span>
            </div>
            {openWork.length ? (
              <div className="home-surface__list">
                {openWork.map((note) => (
                  <button key={note.id} type="button" className="home-surface__note-row" onClick={() => onOpenNote(note.id)}>
                    <div>
                      <small>{note.kicker}</small>
                      <strong>{getCompactDisplayTitle(note, 42)}</strong>
                      <p>{getSummaryPreview(note, 92)}</p>
                    </div>
                    <span>Open</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="home-surface__empty">No open tasks yet.</div>
            )}
          </section>

          <section className="home-surface__panel" aria-label="Recently touched">
            <div className="home-surface__panel-head">
              <div>
                <strong>Recently touched</strong>
                <p>Pick up where you left off in a single click.</p>
              </div>
              <span>{recentNotes.length} shown</span>
            </div>
            {recentNotes.length ? (
              <div className="home-surface__list">
                {recentNotes.map((note) => (
                  <button key={note.id} type="button" className="home-surface__note-row" onClick={() => onOpenNote(note.id)}>
                    <div>
                      <small>{note.kicker}</small>
                      <strong>{getCompactDisplayTitle(note, 42)}</strong>
                      <p>{getSummaryPreview(note, 92)}</p>
                    </div>
                    <span>{note.intent === 'task' ? 'Task' : 'Note'}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="home-surface__empty">Your recent notes will gather here.</div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}
