import { Note } from '../../models/note';
import { CardPosition } from '../../models/workspace';

type Props = {
  note: Note;
  position: CardPosition;
  onOpen: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDrag: (x: number, y: number) => void;
};

export const NoteCard = ({ note, position, onOpen, onPin, onArchive, onDrag }: Props) => {
  return (
    <div
      className="note-card"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) return;
        const offsetX = event.clientX - position.x;
        const offsetY = event.clientY - position.y;
        const onMove = (moveEvent: MouseEvent) => onDrag(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }}
    >
      <button className="card-main" onClick={onOpen}>
        <h3>{note.title}</h3>
        <p>{note.lastInteractionText}</p>
      </button>
      <div className="card-actions">
        <button onClick={onPin}>{note.pinned ? 'Unpin' : 'Pin'}</button>
        <button onClick={onArchive}>Archive</button>
      </div>
    </div>
  );
};
