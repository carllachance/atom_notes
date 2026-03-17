import { getCompactDisplayTitle } from '../noteText';
import { describeNoteTrace } from '../trace';
import { NoteCardModel } from '../types';

type ArchiveViewProps = {
  notes: NoteCardModel[];
  onRestore: (id: string) => void;
};

export function ArchiveView({ notes, onRestore }: ArchiveViewProps) {
  return (
    <section className="archive-view">
      <div className="archive-head">
        <h2>Archive</h2>
        <p>Archived notes keep their exact position when restored.</p>
      </div>
      {notes.length === 0 ? (
        <p className="archive-empty">No archived notes.</p>
      ) : (
        <ul>
          {notes.map((note) => (
            <li key={note.id}>
              <div>
                <strong>{getCompactDisplayTitle(note, 48)}</strong>
                <p>{describeNoteTrace(note)}</p>
              </div>
              <button className="ghost-button" onClick={() => onRestore(note.id)}>
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
