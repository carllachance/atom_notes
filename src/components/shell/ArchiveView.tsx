import { Note } from '../../models/note';

type Props = { notes: Note[]; onRestore: (id: string) => void };

export const ArchiveView = ({ notes, onRestore }: Props) => (
  <div className="archive-view">
    <h2>Archive</h2>
    {notes.map((note) => (
      <div key={note.id} className="archive-item">
        <span>{note.title}</span>
        <button onClick={() => onRestore(note.id)}>Restore</button>
      </div>
    ))}
    {notes.length === 0 && <p>No archived notes.</p>}
  </div>
);
