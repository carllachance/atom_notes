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
        <p>Notes here are out of the workspace until restored.</p>
      </div>
      {notes.length === 0 ? (
        <p className="archive-empty">No archived notes yet.</p>
      ) : (
        <ul>
          {notes.map((note) => (
            <li key={note.id}>
              <div>
                <strong>{note.title}</strong>
                <p>{note.trace}</p>
              </div>
              <button onClick={() => onRestore(note.id)}>Restore to workspace</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
