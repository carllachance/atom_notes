import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getProjectGroupingVisual } from '../relationships/relationshipVisuals';
import { NoteCardModel, Project, Relationship } from '../types';
import { buildClusteredProjectConnectorSegments, useSubtleCanvasClustering } from './canvasClustering';
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
  isDragging: boolean;
  recenterTarget: RecenterTarget | null;
  activeProject: Project | null;
  projectConnectorSegments: ProjectConnectorSegment[];
  relationships: Relationship[];
  onScroll: (left: number, top: number) => void;
  onViewportCenterChange: (x: number, y: number) => void;
  onMetricsChange: (metrics: CanvasViewportMetrics) => void;
  onDragStart: () => void;
  onDragEnd: (id: string, x: number, y: number, moved: boolean) => void;
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
const CLUSTER_FORCE_RESTORE_MS = 420;

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
  isDragging,
  recenterTarget,
  activeProject,
  projectConnectorSegments,
  relationships,
  onScroll,
  onViewportCenterChange,
  onMetricsChange,
  onDragStart,
  onDragEnd,
  onOpen,
  onBringToFront,
  onHoverStart,
  onHoverEnd
}: SpatialCanvasProps) {
  const dragState = useRef<DragState | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const clusterRestoreFrameRef = useRef<number | null>(null);
  const clusterRestoreTargetIdRef = useRef<string | null>(null);
  const pendingDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);
  const [dragPosition, setDragPosition] = useState<{ id: string; x: number; y: number } | null>(null);
  const [clusterForceScaleById, setClusterForceScaleById] = useState<Record<string, number>>({});
  const relatedGlowIdsSet = useMemo(() => new Set(relatedGlowNoteIds), [relatedGlowNoteIds]);
  const revealMatchedIdsSet = useMemo(() => new Set(revealMatchedNoteIds), [revealMatchedNoteIds]);
  const projectVisual = getProjectGroupingVisual();
  const clusterInteraction = useMemo(() => ({ forceScaleById: clusterForceScaleById }), [clusterForceScaleById]);
  const clusteredPositions = useSubtleCanvasClustering(notes, relationships, isDragging, clusterInteraction);
  const clusteredNotes = useMemo(
    () => notes.map((note) => ({ ...note, x: clusteredPositions[note.id]?.x ?? note.x, y: clusteredPositions[note.id]?.y ?? note.y })),
    [clusteredPositions, notes]
  );
  const resolvedProjectConnectorSegments = useMemo(
    () => (activeProject ? buildClusteredProjectConnectorSegments(clusteredNotes.filter((note) => note.projectIds.includes(activeProject.id))) : projectConnectorSegments),
    [activeProject, clusteredNotes, projectConnectorSegments]
  );


  const stopClusterRestoreAnimation = () => {
    if (clusterRestoreFrameRef.current != null) {
      window.cancelAnimationFrame(clusterRestoreFrameRef.current);
      clusterRestoreFrameRef.current = null;
    }
    const targetId = clusterRestoreTargetIdRef.current;
    if (targetId) {
      setClusterForceScaleById((current) => {
        if (!(targetId in current)) return current;
        const { [targetId]: _removed, ...rest } = current;
        return rest;
      });
      clusterRestoreTargetIdRef.current = null;
    }
  };

  const beginClusterForceRestore = (noteId: string) => {
    stopClusterRestoreAnimation();
    clusterRestoreTargetIdRef.current = noteId;
    const startedAt = window.performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / CLUSTER_FORCE_RESTORE_MS);
      setClusterForceScaleById((current) => {
        if (!(noteId in current) && progress >= 1) return current;
        if (progress >= 1) {
          const { [noteId]: _removed, ...rest } = current;
          return rest;
        }
        return { ...current, [noteId]: progress };
      });

      if (progress < 1) {
        clusterRestoreFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        clusterRestoreFrameRef.current = null;
        clusterRestoreTargetIdRef.current = null;
      }
    };

    setClusterForceScaleById((current) => ({ ...current, [noteId]: 0 }));
    clusterRestoreFrameRef.current = window.requestAnimationFrame(tick);
  };

  const flushDragPosition = () => {
    if (!dragState.current || !pendingDragPositionRef.current) return;
    const { x, y } = pendingDragPositionRef.current;
    setDragPosition({ id: dragState.current.id, x, y });
    dragFrameRef.current = null;
  };

  const queueDragPosition = (x: number, y: number) => {
    pendingDragPositionRef.current = { x, y };
    if (dragFrameRef.current != null) return;
    dragFrameRef.current = window.requestAnimationFrame(flushDragPosition);
  };

  const clearDragState = () => {
    if (dragFrameRef.current != null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    pendingDragPositionRef.current = null;
    dragState.current = null;
    setDragPosition(null);
  };

  const finishDrag = () => {
    if (!dragState.current) return;
    const finalPosition = pendingDragPositionRef.current ?? dragPosition;
    const dragTargetId = dragState.current.id;
    const moved = dragState.current.moved;
    clearDragState();
    beginClusterForceRestore(dragTargetId);
    if (finalPosition && 'x' in finalPosition && 'y' in finalPosition) {
      onDragEnd(dragTargetId, finalPosition.x, finalPosition.y, moved);
      return;
    }
    const fallbackNote = notes.find((note) => note.id === dragTargetId);
    onDragEnd(dragTargetId, fallbackNote?.x ?? 0, fallbackNote?.y ?? 0, moved);
  };

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
    return () => {
      if (dragFrameRef.current != null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
      stopClusterRestoreAnimation();
    };
  }, []);

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

        queueDragPosition(
          event.clientX - dragState.current.dx + canvasRef.current!.scrollLeft,
          event.clientY - dragState.current.dy + canvasRef.current!.scrollTop
        );
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div className="canvas-plane">
        {activeProject ? (
          <svg className="project-grouping-overlay" aria-hidden="true">
            {resolvedProjectConnectorSegments.map((segment, index) => (
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
        {clusteredNotes.map((note) => {
          const meta = noteMetaById[note.id];
          return (
            <NoteCard
              key={note.id}
              note={note}
              position={dragPosition?.id === note.id ? { x: dragPosition.x, y: dragPosition.y } : clusteredPositions[note.id] ?? null}
              meta={meta}
              focusHighlightEnabled={focusHighlightEnabled}
              recentlyClosed={recentlyClosedNoteId === note.id}
              ambientRelated={relatedGlowIdsSet.has(note.id)}
              ambientPulse={pulseNoteId === note.id}
              ambientGlowLevel={ambientGlowLevel}
              isDragging={isDragging}
              isDirectlyDragging={dragPosition?.id === note.id}
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
                stopClusterRestoreAnimation();
                setClusterForceScaleById((current) => ({ ...current, [note.id]: 0 }));
                setDragPosition({ id: note.id, x: note.x, y: note.y });
                pendingDragPositionRef.current = { x: note.x, y: note.y };
                onDragStart();
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
