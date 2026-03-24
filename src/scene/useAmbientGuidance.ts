import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NoteCardModel, Relationship } from '../types';

const HOVER_LINGER_MS = 650;
const AMBIENT_GLOW_MAX = 0.52;
const AMBIENT_GLOW_FADE_IN_MS = 420;
const AMBIENT_GLOW_FADE_OUT_MS = 280;
const NEARBY_CONTEXT_DISTANCE_PX = 180;
const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 170;
const RECENT_CLOSE_CLEAR_MS = 2200;
const PULSE_CLEAR_MS = 900;
const VIEWPORT_CENTER_EPSILON = 0.5;

type CanvasCenter = { x: number; y: number };
type RecenterTarget = { x: number; y: number; requestId: number };

type UseAmbientGuidanceOptions = {
  visibleNotes: NoteCardModel[];
  visibleNoteIds: Set<string>;
  relationships: Relationship[];
  allNotes: NoteCardModel[];
};

function getNoteCenter(note: { x: number; y: number }): CanvasCenter {
  return { x: note.x + NOTE_WIDTH / 2, y: note.y + NOTE_HEIGHT / 2 };
}

export function useAmbientGuidance({ visibleNotes, visibleNoteIds, relationships, allNotes }: UseAmbientGuidanceOptions) {
  const [recentlyClosedNoteId, setRecentlyClosedNoteId] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [ambientSourceNoteId, setAmbientSourceNoteId] = useState<string | null>(null);
  const [ambientGlowLevel, setAmbientGlowLevel] = useState(0);
  const [pulseNoteId, setPulseNoteId] = useState<string | null>(null);
  const [lastActiveNoteId, setLastActiveNoteId] = useState<string | null>(null);
  const [recentNoteId, setRecentNoteId] = useState<string | null>(null);
  const [recallNoteId, setRecallNoteId] = useState<string | null>(null);
  const [recentViewportCenter, setRecentViewportCenter] = useState<CanvasCenter | null>(null);
  const [recenterTarget, setRecenterTarget] = useState<RecenterTarget | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const glowAnimationRef = useRef<number | null>(null);
  const glowLevelRef = useRef(0);

  const ambientRelatedNoteIds = useMemo(() => {
    if (!ambientSourceNoteId || ambientGlowLevel <= 0.01) return [];

    const direct = new Set<string>();
    for (const relationship of relationships) {
      if (relationship.fromId === ambientSourceNoteId) direct.add(relationship.toId);
      if (relationship.toId === ambientSourceNoteId) direct.add(relationship.fromId);
    }

    return [...direct].filter((noteId) => noteId !== ambientSourceNoteId && visibleNoteIds.has(noteId));
  }, [ambientGlowLevel, ambientSourceNoteId, relationships, visibleNoteIds]);

  const animateAmbientGlow = useCallback((target: number) => {
    if (glowAnimationRef.current) {
      window.cancelAnimationFrame(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }

    const start = performance.now();
    const initial = glowLevelRef.current;
    const duration = target > initial ? AMBIENT_GLOW_FADE_IN_MS : AMBIENT_GLOW_FADE_OUT_MS;

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - start) / duration);
      const next = initial + (target - initial) * progress;
      glowLevelRef.current = next;
      setAmbientGlowLevel(next);

      if (progress < 1) {
        glowAnimationRef.current = window.requestAnimationFrame(tick);
        return;
      }

      glowAnimationRef.current = null;
      if (target <= 0.01) {
        setAmbientSourceNoteId(null);
      }
    };

    glowAnimationRef.current = window.requestAnimationFrame(tick);
  }, []);

  const cancelHoverIntent = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredNoteId(null);
    animateAmbientGlow(0);
  }, [animateAmbientGlow]);

  useEffect(() => {
    if (!recentlyClosedNoteId) return;
    const timer = window.setTimeout(() => setRecentlyClosedNoteId(null), RECENT_CLOSE_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [recentlyClosedNoteId]);

  useEffect(() => {
    if (!pulseNoteId) return;
    const timer = window.setTimeout(() => setPulseNoteId(null), PULSE_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [pulseNoteId]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
      if (glowAnimationRef.current) window.cancelAnimationFrame(glowAnimationRef.current);
    };
  }, []);

  const panToCenterIfFar = useCallback(
    (targetCenter: CanvasCenter) => {
      if (recentViewportCenter) {
        const distance = Math.hypot(targetCenter.x - recentViewportCenter.x, targetCenter.y - recentViewportCenter.y);
        if (distance <= NEARBY_CONTEXT_DISTANCE_PX) return;
      }

      setRecenterTarget({ x: targetCenter.x, y: targetCenter.y, requestId: Date.now() });
    },
    [recentViewportCenter]
  );

  const onHoverStart = useCallback((id: string) => {
    setHoveredNoteId(id);
    if (glowAnimationRef.current) {
      window.cancelAnimationFrame(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }
    setAmbientSourceNoteId(null);
    glowLevelRef.current = 0;
    setAmbientGlowLevel(0);
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      setAmbientSourceNoteId(id);
      animateAmbientGlow(AMBIENT_GLOW_MAX);
      hoverTimerRef.current = null;
    }, HOVER_LINGER_MS);
  }, [animateAmbientGlow]);

  const onHoverEnd = useCallback((id: string) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredNoteId((current) => (current === id ? null : current));
    setAmbientSourceNoteId((current) => {
      if (current !== id) return current;
      animateAmbientGlow(0);
      return current;
    });
  }, [animateAmbientGlow]);

  const onViewportCenterChange = useCallback((x: number, y: number) => {
    setRecentViewportCenter((current) => {
      if (current && Math.abs(current.x - x) < VIEWPORT_CENTER_EPSILON && Math.abs(current.y - y) < VIEWPORT_CENTER_EPSILON) {
        return current;
      }
      return { x, y };
    });
  }, []);

  const onNoteOpened = useCallback(
    (id: string) => {
      setRecentlyClosedNoteId(null);
      if (lastActiveNoteId && lastActiveNoteId !== id) {
        setRecentNoteId(lastActiveNoteId);
        setRecallNoteId(lastActiveNoteId);
      }
      setLastActiveNoteId(id);
      setRecallNoteId((current) => (current === id ? null : current));
      const targetNote = allNotes.find((note) => note.id === id);
      if (targetNote) {
        setRecentViewportCenter(getNoteCenter(targetNote));
      }
    },
    [allNotes, lastActiveNoteId]
  );

  const onNoteTraversed = useCallback(
    (targetNoteId: string) => {
      if (lastActiveNoteId) {
        setRecentNoteId(lastActiveNoteId);
        setRecallNoteId(lastActiveNoteId);
      }
      setLastActiveNoteId(targetNoteId);
    },
    [lastActiveNoteId]
  );

  const onActiveNoteClosed = useCallback((activeNoteId: string | null) => {
    if (activeNoteId) {
      setRecentlyClosedNoteId(activeNoteId);
      setRecallNoteId(activeNoteId);
    }
  }, []);

  const onNoteArchived = useCallback((id: string) => {
    setRecentlyClosedNoteId(id);
    setRecallNoteId((current) => (current === id ? null : current));
  }, []);

  const onWhereWasI = useCallback(() => {
    const primaryTargetId = [lastActiveNoteId, recentNoteId].find((id) => id && visibleNoteIds.has(id)) ?? null;
    const targetNote = primaryTargetId ? visibleNotes.find((note) => note.id === primaryTargetId) ?? null : null;
    const targetCenter = targetNote ? getNoteCenter(targetNote) : recentViewportCenter;

    if (!targetCenter) return;

    if (recentViewportCenter) {
      const distance = Math.hypot(targetCenter.x - recentViewportCenter.x, targetCenter.y - recentViewportCenter.y);
      if (distance <= NEARBY_CONTEXT_DISTANCE_PX) {
        if (targetNote) setPulseNoteId(targetNote.id);
        return;
      }
    }

    setRecenterTarget({ x: targetCenter.x, y: targetCenter.y, requestId: Date.now() });

    if (targetNote) setPulseNoteId(targetNote.id);
  }, [lastActiveNoteId, recentNoteId, recentViewportCenter, visibleNoteIds, visibleNotes]);

  const clearRecallCue = useCallback(() => {
    setRecallNoteId(null);
  }, []);

  return {
    hoveredNoteId,
    recentlyClosedNoteId,
    pulseNoteId,
    recenterTarget,
    recallNoteId,
    ambientRelatedNoteIds,
    ambientGlowLevel,
    cancelHoverIntent,
    onHoverStart,
    onHoverEnd,
    onViewportCenterChange,
    onNoteOpened,
    onNoteTraversed,
    onActiveNoteClosed,
    onNoteArchived,
    onWhereWasI,
    clearRecallCue,
    panToCenterIfFar
  };
}
