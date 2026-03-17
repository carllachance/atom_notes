import { Note } from '../../models/note';

type Props = { notes: Note[]; onOpen: (id: string) => void };

export const AnchorRow = ({ notes, onOpen }: Props) => (
  <div className="anchor-row">
    {notes.map((note) => (
      <button key={note.id} onClick={() => onOpen(note.id)}>
        {note.title}
      </button>
    ))}
  </div>
);
