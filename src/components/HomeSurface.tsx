import { useMemo } from 'react';
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
    .slice(0, 4)
    .map((note) => ({ ...note, kicker: 'Needs action' }));
}

function summarizeRecentNotes(notes: NoteCardModel[], lastCreatedNoteId: string | null): SurfaceNote[] {
  return notes
    .filter((note) => !note.archived && !note.deleted)
    .sort((a, b) => {
      if (a.id === lastCreatedNoteId) return -1;
      if (b.id === lastCreatedNoteId) return 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 5)
    .map((note, index) => ({
      ...note,
      kicker: note.id === lastCreatedNoteId ? 'Latest capture' : index === 0 ? 'Recently active' : 'Touched recently'
    }));
}

export function HomeSurface({
  notes,
  deletedNotes,
  lastCreatedNoteId,
  onOpenNote,
  onRestoreDeletedNote
}: HomeSurfaceProps) {
  const openWork = useMemo(() => summarizeOpenWork(notes), [notes]);
  const recentNotes = useMemo(() => summarizeRecentNotes(notes, lastCreatedNoteId), [notes, lastCreatedNoteId]);
  const resumeItems = [...recentNotes.slice(0, 3), ...openWork.filter((note) => !recentNotes.some((recent) => recent.id === note.id)).slice(0, 2)].slice(0, 5);
  const leadResume = resumeItems[0] ?? null;
  const secondaryResumeItems = leadResume ? resumeItems.filter((note) => note.id !== leadResume.id) : resumeItems;

  return (
    <section className="home-surface home-surface--light" aria-label="Workspace overview">
      <section className="home-surface__resume" aria-label="Where was I">
        <header className="home-surface__resume-head">
          <h1>{leadResume ? getCompactDisplayTitle(leadResume, 60) : 'Pick up your latest thread'}</h1>
          {leadResume ? <p>{leadResume.kicker} · continue where momentum was last highest.</p> : null}
        </header>
        {secondaryResumeItems.length ? (
          <div className="home-surface__list home-surface__resume-list">
            {secondaryResumeItems.map((note) => (
              <button key={note.id} type="button" className="home-surface__note-row" onClick={() => onOpenNote(note.id)}>
                <div>
                  <small>{note.kicker}</small>
                  <strong>{getCompactDisplayTitle(note, 48)}</strong>
                  <p>{getSummaryPreview(note, 108)}</p>
                </div>
                <span>Continue</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="home-surface__deck" aria-label="Home workspace">
        <section className="home-surface__panel home-surface__panel--cornell" aria-label="Action queue">
          <div className="home-surface__panel-head">
            <div>
              <strong>Action queue</strong>
              <p>Short list of notes that need movement next.</p>
            </div>
            <span>{openWork.length} open</span>
          </div>
          <div className="home-surface__list">
            {openWork.length ? openWork.map((note) => (
              <button key={note.id} type="button" className="home-surface__note-row" onClick={() => onOpenNote(note.id)}>
                <div>
                  <small>{note.kicker}</small>
                  <strong>{getCompactDisplayTitle(note, 48)}</strong>
                  <p>{getSummaryPreview(note, 108)}</p>
                </div>
                <span>Open</span>
              </button>
            )) : <p className="home-surface__empty-prompt">No open tasks right now. Capture ideas, then promote only what matters.</p>}
          </div>
        </section>

        <section className="home-surface__panel home-surface__panel--cornell" aria-label="Recent notes">
          <div className="home-surface__panel-head">
            <div>
              <strong>Recent notes</strong>
              <p>Your freshest thinking, ready for another pass.</p>
            </div>
            <span>{recentNotes.length} recent</span>
          </div>
          <div className="home-surface__list">
            {recentNotes.map((note) => (
              <button key={note.id} type="button" className="home-surface__note-row" onClick={() => onOpenNote(note.id)}>
                <div>
                  <small>{note.kicker}</small>
                  <strong>{getCompactDisplayTitle(note, 48)}</strong>
                  <p>{getSummaryPreview(note, 108)}</p>
                </div>
                <span>Open</span>
              </button>
            ))}
          </div>
        </section>
      </section>

      {deletedNotes.length ? (
        <section className="home-surface__panel" aria-label="Recently deleted notes">
          <div className="home-surface__panel-head">
            <div>
              <strong>Recently deleted</strong>
              <p>Trash stays reversible. Restore a note with links intact.</p>
            </div>
            <span>{deletedNotes.length} in trash</span>
          </div>
          <div className="home-surface__list">
            {deletedNotes.slice(0, 3).map((note) => (
              <div key={note.id} className="home-surface__note-row home-surface__note-row--static">
                <div>
                  <small>Deleted</small>
                  <strong>{getCompactDisplayTitle(note, 48)}</strong>
                  <p>{getSummaryPreview(note, 108)}</p>
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
