import { useRef } from 'react';
import { NoteCardModel } from '../types';
import { NoteCard } from './NoteCard';

type SpatialCanvasProps = {
  notes: NoteCardModel[];
  onDrag: (id: string, x: number, y: number) => void;
  onOpen: (id: string) => void;
  onBringToFront: (id: string) => void;
};

export function SpatialCanvas({ notes, onDrag, onOpen, onBringToFront }: SpatialCanvasProps) {
  const dragState = useRef<{ id: string; dx: number; dy: number } | null>(null);

  return (
    <section
      className="spatial-canvas"
      onPointerMove={(event) => {
        if (!dragState.current) return;
        onDrag(dragState.current.id, event.clientX - dragState.current.dx, event.clientY - dragState.current.dy);
      }}
      onPointerUp={() => {
        dragState.current = null;
      }}
    >
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onOpen={() => onOpen(note.id)}
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            dragState.current = {
              id: note.id,
              dx: event.clientX - rect.left,
              dy: event.clientY - rect.top
            };
            onBringToFront(note.id);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
        />
      ))}
    </section>
  );
}
