import { useState } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { NoteCardModel } from '../types';

type HomeSurfaceProps = {
  notes: NoteCardModel[];
  deletedNotes: NoteCardModel[];
  lastCreatedNoteId: string | null;
  onOpenNote: (noteId: string) => void;
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
  notes,
  deletedNotes,
  lastCreatedNoteId,
  onOpenNote,
  onRestoreDeletedNote
}: HomeSurfaceProps) {
  const openWork = summarizeOpenWork(notes);
  const recentNotes = summarizeRecentNotes(notes, lastCreatedNoteId);
  const [showResume, setShowResume] = useState(false);
  const resumeItems = [...recentNotes.slice(0, 3), ...openWork.filter((note) => !recentNotes.some((recent) => recent.id === note.id)).slice(0, 1)].slice(0, 4);
  const leadResume = resumeItems[0] ?? null;
  const hasResume = resumeItems.length > 0;

  return (
    <section className="home-surface home-surface--light" aria-label="Workspace overview">
      {hasResume ? (
        <section className="home-surface__resume" aria-label="Where was I">
          <button type="button" className="home-surface__resume-chip" onClick={() => setShowResume((current) => !current)} aria-expanded={showResume}>
            <span className="home-surface__resume-label">Where was I</span>
            <strong>{leadResume ? getCompactDisplayTitle(leadResume, 42) : 'Recent work'}</strong>
          </button>
          {showResume ? (
            <div className="home-surface__resume-popover">
              {resumeItems.map((note) => (
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
          ) : null}
        </section>
      ) : (
        <section className="home-surface__empty-prompt" aria-label="Start capturing">
          <span className="home-surface__eyebrow">Start here</span>
          <strong>Your first note can stay small.</strong>
        </section>
      )}

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
    </section>
  );
}
