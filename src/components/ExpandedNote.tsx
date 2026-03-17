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
    <section className="expanded-note-shell" onClick={onClose}>
      <aside className="expanded-note" onClick={(event) => event.stopPropagation()}>
        <input
          aria-label="Note title"
          value={note.title}
          onChange={(event) => onChange(note.id, { title: event.target.value })}
        />
        <textarea
          aria-label="Note body"
          value={note.body}
          onChange={(event) => onChange(note.id, { body: event.target.value })}
        />
        <div className="expanded-actions">
          <button className="ghost-button" onClick={() => onArchive(note.id)}>
            Archive
          </button>
          <button className="ghost-button" onClick={onClose}>
            Back to canvas
          </button>
        </div>
      </aside>
    </section>
  );
}
