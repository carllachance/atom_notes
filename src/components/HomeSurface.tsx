import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { NoteCardModel } from '../types';

const QUICK_WINS = [
  'Capture rough notes without setting up structure.',
  'Clarify or turn them into an executive summary next.',
  'Pull likely follow-ups into tasks only if you want to.'
];

type HomeSurfaceProps = {
  draft: string;
  notes: NoteCardModel[];
  lastCreatedNoteId: string | null;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onOpenNote: (noteId: string) => void;
  onOpenCaptureComposer: () => void;
};

type SurfaceNote = NoteCardModel & {
  kicker: string;
};

function summarizeOpenWork(notes: NoteCardModel[]): SurfaceNote[] {
  return notes
    .filter((note) => !note.archived && note.intent === 'task' && note.taskState !== 'done')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3)
    .map((note) => ({ ...note, kicker: 'Open task' }));
}

function summarizeRecentNotes(notes: NoteCardModel[], lastCreatedNoteId: string | null): SurfaceNote[] {
  return notes
    .filter((note) => !note.archived)
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
  lastCreatedNoteId,
  onDraftChange,
  onCommit,
  onOpenNote,
  onOpenCaptureComposer
}: HomeSurfaceProps) {
  const openWork = summarizeOpenWork(notes);
  const recentNotes = summarizeRecentNotes(notes, lastCreatedNoteId);
  const hasNotes = notes.some((note) => !note.archived);

  return (
    <section className="home-surface" aria-label="Where Was I home surface">
      <div className="home-surface__hero">
        <div className="home-surface__copy">
          <span className="home-surface__eyebrow">Where was I?</span>
          <h1>Start with what you need to capture, clarify, or follow up.</h1>
          <p>
            Drop in rough notes first. The app can help you tighten them, summarize them, and surface likely next steps before you ever need the graph.
          </p>
          <ul className="home-surface__quick-wins" aria-label="First steps">
            {QUICK_WINS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="home-surface__capture">
          <label className="home-surface__capture-label" htmlFor="home-capture">
            Capture anything messy
          </label>
          <textarea
            id="home-capture"
            placeholder="Paste meeting notes, class notes, or a rough plan. The first line becomes the title."
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
          />
          <div className="home-surface__capture-actions">
            <button type="button" className="ghost-button" onClick={onOpenCaptureComposer}>
              Full capture view
            </button>
            <button type="button" onClick={onCommit} disabled={!draft.trim()}>
              Capture note
            </button>
          </div>
          <div className="home-surface__capture-payoff" aria-label="What happens next">
            <span>Then you can:</span>
            <strong>Clarify</strong>
            <strong>Executive Summary</strong>
            <strong>Promote follow-ups to tasks</strong>
          </div>
        </div>
      </div>

      <div className="home-surface__sections">
        <section className="home-surface__panel" aria-label="Needs attention">
          <div className="home-surface__panel-head">
            <div>
              <strong>Needs attention</strong>
              <p>Open tasks and unresolved work stay visible here.</p>
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
            <div className="home-surface__empty">No open tasks yet. Capture a rough note and promote only the follow-ups that matter.</div>
          )}
        </section>

        <section className="home-surface__panel" aria-label="Recently touched">
          <div className="home-surface__panel-head">
            <div>
              <strong>Recently touched</strong>
              <p>{hasNotes ? 'Pick up where you left off in a single click.' : 'Your first captures will show up here.'}</p>
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
            <div className="home-surface__empty">Nothing captured yet. Start with one rough note above and let the system reveal next steps after that.</div>
          )}
        </section>
      </div>
    </section>
  );
}
