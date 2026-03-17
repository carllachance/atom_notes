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
        <h2>Drift layer</h2>
        <p>Thoughts settle here until you pull them back in.</p>
      </div>
      {notes.length === 0 ? (
        <p className="archive-empty">Nothing resting right now.</p>
      ) : (
        <ul>
          {notes.map((note) => (
            <li key={note.id}>
              <div>
                <strong>{note.title}</strong>
                <p>{describeNoteTrace(note)}</p>
              </div>
              <button className="ghost-button" onClick={() => onRestore(note.id)}>
                Return
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
