import { NoteCardModel } from '../types';

type ArchiveViewProps = {
  notes: NoteCardModel[];
  onRestore: (id: string) => void;
};

export function ArchiveView({ notes, onRestore }: ArchiveViewProps) {
  return (
    <section className="archive-view">
      <h2>Archive</h2>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <span>{note.title}</span>
            <button onClick={() => onRestore(note.id)}>Restore</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
