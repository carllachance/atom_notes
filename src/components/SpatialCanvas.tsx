import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getCanvasWorldBounds } from '../canvas/world';
import { getDefaultPrimaryNoteIds, getCanvasVisualState } from '../canvas/visibility';
import { NoteCardModel, Relationship } from '../types';
import { NoteCard } from './NoteCard';

type RecenterTarget = {
  x: number;
  y: number;
  requestId: number;
};

type SpatialCanvasProps = {
  notes: NoteCardModel[];
  relationships: Relationship[];
  activeNoteId: string | null;
  hoveredNoteId: string | null;
  selectedContextNoteIds: string[];
  revealMatchedNoteIds: string[];
  revealActiveNoteId: string | null;
  initialScrollLeft: number;
  initialScrollTop: number;
  recentlyClosedNoteId: string | null;
  relatedGlowNoteIds: string[];
  pulseNoteId: string | null;
  ambientGlowLevel: number;
  recenterTarget: RecenterTarget | null;
  onScroll: (left: number, top: number) => void;
  onViewportCenterChange: (x: number, y: number) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onOpen: (id: string) => void;
  onBringToFront: (id: string) => void;
  onHoverStart: (id: string) => void;
  onHoverEnd: (id: string) => void;
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
  relationships,
  activeNoteId,
  hoveredNoteId,
  selectedContextNoteIds,
  revealMatchedNoteIds,
  revealActiveNoteId,
  initialScrollLeft,
  initialScrollTop,
  recentlyClosedNoteId,
  relatedGlowNoteIds,
  pulseNoteId,
  ambientGlowLevel,
  recenterTarget,
  onScroll,
  onViewportCenterChange,
  onDrag,
  onOpen,
  onBringToFront,
  onHoverStart,
  onHoverEnd
}: SpatialCanvasProps) {
  const dragState = useRef<DragState | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const relatedGlowIdsSet = useMemo(() => new Set(relatedGlowNoteIds), [relatedGlowNoteIds]);
  const revealMatchedIdsSet = useMemo(() => new Set(revealMatchedNoteIds), [revealMatchedNoteIds]);
  const defaultPrimaryNoteIds = useMemo(() => new Set(getDefaultPrimaryNoteIds(notes, relationships)), [notes, relationships]);
  const worldBounds = useMemo(() => getCanvasWorldBounds(notes), [notes]);

  const emitViewportCenter = () => {
    const node = canvasRef.current;
    if (!node) return;
    onViewportCenterChange(
      node.scrollLeft + node.clientWidth / 2 - worldBounds.offsetX,
      node.scrollTop + node.clientHeight / 2 - worldBounds.offsetY
    );
  };

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.scrollLeft = initialScrollLeft + worldBounds.offsetX;
    canvasRef.current.scrollTop = initialScrollTop + worldBounds.offsetY;
    emitViewportCenter();
  }, [initialScrollLeft, initialScrollTop, worldBounds.offsetX, worldBounds.offsetY]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const onScrollEvent = () => {
      onScroll(node.scrollLeft - worldBounds.offsetX, node.scrollTop - worldBounds.offsetY);
      emitViewportCenter();
    };
    node.addEventListener('scroll', onScrollEvent);
    emitViewportCenter();
    return () => node.removeEventListener('scroll', onScrollEvent);
  }, [onScroll, worldBounds.offsetX, worldBounds.offsetY]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node || !recenterTarget) return;

    node.scrollTo({
      left: Math.max(0, recenterTarget.x + worldBounds.offsetX - node.clientWidth / 2),
      top: Math.max(0, recenterTarget.y + worldBounds.offsetY - node.clientHeight / 2),
      behavior: 'smooth'
    });
  }, [recenterTarget, worldBounds.offsetX, worldBounds.offsetY]);

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
          setDraggingNoteId(dragState.current.id);
        }

        onDrag(
          dragState.current.id,
          event.clientX - dragState.current.dx + canvasRef.current!.scrollLeft - worldBounds.offsetX,
          event.clientY - dragState.current.dy + canvasRef.current!.scrollTop - worldBounds.offsetY
        );
      }}
      onPointerUp={() => {
        dragState.current = null;
        setDraggingNoteId(null);
      }}
      onPointerLeave={() => {
        dragState.current = null;
        setDraggingNoteId(null);
      }}
    >
      <div className="canvas-plane" style={{ width: worldBounds.width, height: worldBounds.height }}>
        {notes.map((note) => {
          const visual = getCanvasVisualState(note, defaultPrimaryNoteIds, {
            activeNoteId,
            hoveredNoteId,
            draggingNoteId,
            revealMatchedNoteIds,
            revealActiveNoteId,
            relatedHoverNoteIds: relatedGlowNoteIds,
            selectedContextNoteIds
          });

          return (
            <NoteCard
              key={note.id}
              note={note}
              worldOffsetX={worldBounds.offsetX}
              worldOffsetY={worldBounds.offsetY}
              visual={visual}
              recentlyClosed={recentlyClosedNoteId === note.id}
              ambientRelated={relatedGlowIdsSet.has(note.id)}
              ambientPulse={pulseNoteId === note.id}
              ambientGlowLevel={ambientGlowLevel}
              revealMatched={revealMatchedIdsSet.has(note.id)}
              revealActive={revealActiveNoteId === note.id}
              isActive={activeNoteId === note.id}
              isHovered={hoveredNoteId === note.id}
              onPointerEnter={() => onHoverStart(note.id)}
              onPointerLeave={() => onHoverEnd(note.id)}
              onPointerDown={(event) => {
                onHoverEnd(note.id);
                const rect = event.currentTarget.getBoundingClientRect();
                dragState.current = {
                  id: note.id,
                  dx: event.clientX - rect.left,
                  dy: event.clientY - rect.top,
                  startX: event.clientX,
                  startY: event.clientY,
                  moved: false
                };
                setDraggingNoteId(note.id);
                onBringToFront(note.id);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={() => {
                if (!dragState.current || dragState.current.id !== note.id) return;
                if (!dragState.current.moved) onOpen(note.id);
                dragState.current = null;
                setDraggingNoteId(null);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
