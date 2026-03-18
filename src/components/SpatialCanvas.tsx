import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ProjectRevealPresentation } from '../projects/projectSelectors';
import { NoteCardModel } from '../types';
import { NoteCard } from './NoteCard';
import { ProjectRevealLayer } from './ProjectRevealLayer';

type RecenterTarget = {
  x: number;
  y: number;
  requestId: number;
};

type SpatialCanvasProps = {
  notes: NoteCardModel[];
  activeNoteId: string | null;
  hoveredNoteId: string | null;
  revealMatchedNoteIds: string[];
  revealActiveNoteId: string | null;
  initialScrollLeft: number;
  initialScrollTop: number;
  recentlyClosedNoteId: string | null;
  relatedGlowNoteIds: string[];
  pulseNoteId: string | null;
  ambientGlowLevel: number;
  recenterTarget: RecenterTarget | null;
  projectReveal: ProjectRevealPresentation;
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
  activeNoteId,
  hoveredNoteId,
  revealMatchedNoteIds,
  revealActiveNoteId,
  initialScrollLeft,
  initialScrollTop,
  recentlyClosedNoteId,
  relatedGlowNoteIds,
  pulseNoteId,
  ambientGlowLevel,
  recenterTarget,
  projectReveal,
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
  const relatedGlowIdsSet = useMemo(() => new Set(relatedGlowNoteIds), [relatedGlowNoteIds]);
  const revealMatchedIdsSet = useMemo(() => new Set(revealMatchedNoteIds), [revealMatchedNoteIds]);
  const projectMemberIds = useMemo(() => new Set(projectReveal.memberNoteIds), [projectReveal.memberNoteIds]);

  const emitViewportCenter = () => {
    const node = canvasRef.current;
    if (!node) return;
    onViewportCenterChange(node.scrollLeft + node.clientWidth / 2, node.scrollTop + node.clientHeight / 2);
  };

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.scrollLeft = initialScrollLeft;
    canvasRef.current.scrollTop = initialScrollTop;
    emitViewportCenter();
  }, [initialScrollLeft, initialScrollTop]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const onScrollEvent = () => {
      onScroll(node.scrollLeft, node.scrollTop);
      emitViewportCenter();
    };
    node.addEventListener('scroll', onScrollEvent);
    emitViewportCenter();
    return () => node.removeEventListener('scroll', onScrollEvent);
  }, [onScroll]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node || !recenterTarget) return;

    node.scrollTo({
      left: Math.max(0, recenterTarget.x - node.clientWidth / 2),
      top: Math.max(0, recenterTarget.y - node.clientHeight / 2),
      behavior: 'smooth'
    });
  }, [recenterTarget]);

  return (
    <section
      ref={canvasRef}
      className="spatial-canvas"
      data-project-reveal={projectReveal.project ? 'active' : 'idle'}
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
        <ProjectRevealLayer project={projectReveal.project} notes={projectReveal.memberNotes} />
        {notes.map((note) => {
          const isProjectMember = projectMemberIds.has(note.id);
          const projectState = projectReveal.project ? (isProjectMember ? 'member' : 'subdued') : 'idle';
          return (
            <NoteCard
              key={note.id}
              note={note}
              recentlyClosed={recentlyClosedNoteId === note.id}
              ambientRelated={relatedGlowIdsSet.has(note.id)}
              ambientPulse={pulseNoteId === note.id}
              ambientGlowLevel={ambientGlowLevel}
              revealMatched={revealMatchedIdsSet.has(note.id)}
              revealActive={revealActiveNoteId === note.id}
              isActive={activeNoteId === note.id}
              isHovered={hoveredNoteId === note.id}
              projectState={projectState}
              projectAccentColor={projectReveal.project?.color ?? null}
              projectLabel={isProjectMember && projectReveal.project ? `${projectReveal.project.name} project` : null}
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
                onBringToFront(note.id);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerUp={() => {
                if (!dragState.current || dragState.current.id !== note.id) return;
                if (!dragState.current.moved) onOpen(note.id);
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
