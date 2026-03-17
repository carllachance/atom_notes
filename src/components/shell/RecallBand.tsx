import { Note } from '../../models/note';

type Props = { notes: Note[] };

export const RecallBand = ({ notes }: Props) => (
  <div className="recall-band">
    {notes.map((note) => (
      <div key={note.id} className="recall-chip">
        {note.title}
      </div>
    ))}
  </div>
);
