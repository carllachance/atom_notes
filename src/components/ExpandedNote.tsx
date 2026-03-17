import type { NoteCardModel } from '../types';

type ExpandedNoteProps = {
  card: NoteCardModel | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<NoteCardModel>) => void;
};

export function ExpandedNote({ card, onClose, onUpdate }: ExpandedNoteProps) {
  if (!card) return null;

  return (
    <aside className="expanded-note">
      <button onClick={onClose}>Close</button>
      <input value={card.title} onChange={(event) => onUpdate(card.id, { title: event.target.value })} />
      <textarea value={card.body} onChange={(event) => onUpdate(card.id, { body: event.target.value })} />
    </aside>
  );
}
