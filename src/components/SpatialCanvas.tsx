import { useEffect, useLayoutEffect, useRef } from 'react';
import { NoteCardModel } from '../types';
import { NoteCard } from './NoteCard';

type SpatialCanvasProps = {
  notes: NoteCardModel[];
  initialScrollLeft: number;
  initialScrollTop: number;
  recentlyClosedNoteId: string | null;
  onScroll: (left: number, top: number) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onOpen: (id: string) => void;
  onBringToFront: (id: string) => void;
};

type DragState = {
  id: string;
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const OPEN_THRESHOLD_PX = 6;

export function SpatialCanvas({
  notes,
  initialScrollLeft,
  initialScrollTop,
  recentlyClosedNoteId,
  onScroll,
  onDrag,
  onOpen,
  onBringToFront
}: SpatialCanvasProps) {
  const dragState = useRef<DragState | null>(null);
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

        const deltaX = Math.abs(event.clientX - dragState.current.startX);
        const deltaY = Math.abs(event.clientY - dragState.current.startY);
        if (!dragState.current.moved && (deltaX > OPEN_THRESHOLD_PX || deltaY > OPEN_THRESHOLD_PX)) {
          dragState.current.moved = true;
        }

        onDrag(
          dragState.current.id,
          event.clientX - dragState.current.dx + canvasRef.current!.scrollLeft,
          event.clientY - dragState.current.dy + canvasRef.current!.scrollTop
        );
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
            recentlyClosed={recentlyClosedNoteId === note.id}
            onPointerDown={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              dragState.current = {
                id: note.id,
                dx: event.clientX - rect.left,
                dy: event.clientY - rect.top,
                startX: event.clientX,
                startY: event.clientY,
                moved: false
              };
              onBringToFront(note.id);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={() => {
              if (!dragState.current || dragState.current.id !== note.id) return;
              if (!dragState.current.moved) onOpen(note.id);
            }}
          />
        ))}
      </div>
    </section>
  );
}
