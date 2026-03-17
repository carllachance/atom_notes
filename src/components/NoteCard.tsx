import { useRef } from 'react';
import type { NoteCardModel } from '../types';

type NoteCardProps = {
  card: NoteCardModel;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onArchive: (id: string) => void;
};

export function NoteCard({ card, selected, onSelect, onMove, onArchive }: NoteCardProps) {
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  return (
    <article
      className={`note-card ${selected ? 'selected' : ''}`}
      style={{ transform: `translate(${card.x}px, ${card.y}px)` }}
      onPointerDown={(event) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        dragRef.current = {
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
        };
        onSelect(card.id);

        const onPointerMove = (moveEvent: PointerEvent) => {
          if (!dragRef.current) return;
          onMove(card.id, moveEvent.clientX - dragRef.current.offsetX, moveEvent.clientY - dragRef.current.offsetY);
        };

        const onPointerUp = () => {
          dragRef.current = null;
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      }}
    >
      <h3>{card.title || 'Untitled'}</h3>
      <p>{card.body.slice(0, 140)}</p>
      <button onClick={() => onArchive(card.id)}>Archive</button>
    </article>
  );
}
