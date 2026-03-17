import { NoteCardModel } from '../types';

type ExpandedNoteProps = {
  note: NoteCardModel | null;
  onClose: () => void;
  onArchive: (id: string) => void;
  onChange: (id: string, updates: Partial<NoteCardModel>) => void;
};

export function ExpandedNote({ note, onClose, onArchive, onChange }: ExpandedNoteProps) {
  if (!note) return null;

  return (
    <aside className="expanded-note">
      <h2>Focused note</h2>
      <input value={note.title} onChange={(event) => onChange(note.id, { title: event.target.value })} />
      <textarea value={note.body} onChange={(event) => onChange(note.id, { body: event.target.value })} />
      <div className="expanded-actions">
        <button className="ghost-button" onClick={() => onArchive(note.id)}>
          Move to archive
        </button>
        <button onClick={onClose}>Done</button>
      </div>
    </aside>
  );
}
