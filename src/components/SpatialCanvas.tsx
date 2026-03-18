import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { getProjectGroupingVisual } from '../relationships/relationshipVisuals';
import { NoteCardModel, Project } from '../types';
import { LensNotePresentation } from '../scene/lens';
import { ProjectConnectorSegment } from '../projects/projectSelectors';
import { CanvasViewportMetrics } from './relationshipWebGeometry';
import { NoteCard } from './NoteCard';

type RecenterTarget = {
  x: number;
  y: number;
  requestId: number;
};

type SpatialCanvasProps = {
  notes: NoteCardModel[];
  noteMetaById: Record<string, LensNotePresentation>;
  focusHighlightEnabled: boolean;
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
  activeProject: Project | null;
  projectConnectorSegments: ProjectConnectorSegment[];
  onScroll: (left: number, top: number) => void;
  onViewportCenterChange: (x: number, y: number) => void;
  onMetricsChange: (metrics: CanvasViewportMetrics) => void;
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
  noteMetaById,
  focusHighlightEnabled,
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
  activeProject,
  projectConnectorSegments,
  onScroll,
  onViewportCenterChange,
  onMetricsChange,
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
  const projectVisual = getProjectGroupingVisual();

  const emitViewportCenter = () => {
    const node = canvasRef.current;
    if (!node) return;
    onViewportCenterChange(node.scrollLeft + node.clientWidth / 2, node.scrollTop + node.clientHeight / 2);
  };

  const emitCanvasMetrics = () => {
    const node = canvasRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    onMetricsChange({
      left: rect.left,
      top: rect.top,
      scrollLeft: node.scrollLeft,
      scrollTop: node.scrollTop
    });
  };

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.scrollLeft = initialScrollLeft;
    canvasRef.current.scrollTop = initialScrollTop;
    emitViewportCenter();
    emitCanvasMetrics();
  }, [initialScrollLeft, initialScrollTop]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const onScrollEvent = () => {
      onScroll(node.scrollLeft, node.scrollTop);
      emitViewportCenter();
      emitCanvasMetrics();
    };
    node.addEventListener('scroll', onScrollEvent);
    emitViewportCenter();
    emitCanvasMetrics();
    return () => node.removeEventListener('scroll', onScrollEvent);
  }, [onMetricsChange, onScroll]);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;

    const updateMetrics = () => {
      emitViewportCenter();
      emitCanvasMetrics();
    };

    updateMetrics();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateMetrics);
      return () => window.removeEventListener('resize', updateMetrics);
    }

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(node);
    window.addEventListener('resize', updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, [onMetricsChange, onViewportCenterChange]);

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
      data-project-reveal={activeProject ? 'active' : 'idle'}
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
        {activeProject ? (
          <svg className="project-grouping-overlay" aria-hidden="true">
            {projectConnectorSegments.map((segment, index) => (
              <path
                key={`${segment.from.x}-${segment.from.y}-${segment.to.x}-${segment.to.y}-${index}`}
                className="project-grouping-link"
                data-relationship-category="project"
                d={`M ${segment.from.x} ${segment.from.y} Q ${(segment.from.x + segment.to.x) / 2} ${(segment.from.y + segment.to.y) / 2 - 28} ${segment.to.x} ${segment.to.y}`}
                style={{
                  ['--project-accent' as string]: activeProject.color,
                  strokeWidth: projectVisual.connector.strokeWidth,
                  opacity: projectVisual.connector.opacity,
                  filter: `blur(${projectVisual.connector.blurRadius}px)`,
                  strokeDasharray: projectVisual.connector.dasharray === 'none' ? undefined : projectVisual.connector.dasharray
                }}
              />
            ))}
          </svg>
        ) : null}
        {notes.map((note) => {
          const meta = noteMetaById[note.id];
          return (
            <NoteCard
              key={note.id}
              note={note}
              meta={meta}
              focusHighlightEnabled={focusHighlightEnabled}
              recentlyClosed={recentlyClosedNoteId === note.id}
              ambientRelated={relatedGlowIdsSet.has(note.id)}
              ambientPulse={pulseNoteId === note.id}
              ambientGlowLevel={ambientGlowLevel}
              revealMatched={revealMatchedIdsSet.has(note.id)}
              revealActive={revealActiveNoteId === note.id}
              isActive={activeNoteId === note.id}
              isHovered={hoveredNoteId === note.id}
              activeProjectColor={activeProject?.color ?? null}
              activeProjectLabel={activeProject?.key ?? null}
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
