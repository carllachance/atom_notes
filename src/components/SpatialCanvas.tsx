import { useEffect, useLayoutEffect, useRef } from 'react';
import { NoteCardModel } from '../types';
import { NoteCard } from './NoteCard';

type SpatialCanvasProps = {
  notes: NoteCardModel[];
  initialScrollLeft: number;
  initialScrollTop: number;
  onScroll: (left: number, top: number) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onOpen: (id: string) => void;
  onBringToFront: (id: string) => void;
};

export function SpatialCanvas({
  notes,
  initialScrollLeft,
  initialScrollTop,
  onScroll,
  onDrag,
  onOpen,
  onBringToFront
}: SpatialCanvasProps) {
  const dragState = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.scrollLeft = initialScrollLeft;
    canvasRef.current.scrollTop = initialScrollTop;
  }, [initialScrollLeft, initialScrollTop]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const onScrollEvent = () => onScroll(node.scrollLeft, node.scrollTop);
    node.addEventListener('scroll', onScrollEvent);
    return () => node.removeEventListener('scroll', onScrollEvent);
  }, [onScroll]);

  return (
    <section
      ref={canvasRef}
      className="spatial-canvas"
      onPointerMove={(event) => {
        if (!dragState.current) return;
        onDrag(dragState.current.id, event.clientX - dragState.current.dx + canvasRef.current!.scrollLeft, event.clientY - dragState.current.dy + canvasRef.current!.scrollTop);
      }}
      onPointerUp={() => {
        dragState.current = null;
      }}
    >
      <div className="canvas-plane">
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
      </div>
    </section>
  );
}
