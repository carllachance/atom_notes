import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createNote, now } from '../notes/noteModel';
import { getCompactDisplayTitle } from '../noteText';
import { getRankedRelationshipsForNote, getRelationshipTargetNoteId, refreshInferredRelationships } from '../relationshipLogic';
import {
  confirmRelationshipInScene,
  createExplicitRelationshipInScene,
  traverseToRelatedInScene
} from '../relationships/relationshipActions';
import {
  archiveNoteInScene,
  bringNoteToFrontInScene,
  closeActiveNoteInScene,
  openNoteInScene,
  setCanvasScrollInScene,
  setLensInScene,
  toggleNoteFocusInScene,
  updateNoteInScene
} from './sceneActions';
import { loadScene, saveScene } from './sceneStorage';
import { applyLens } from './lens';
import { Lens, RelationshipType, SceneState } from '../types';

const CTRL_DOUBLE_TAP_MS = 320;
const HOVER_LINGER_MS = 650;
const NEARBY_CONTEXT_DISTANCE_PX = 180;
const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 170;
const REVEAL_CLEAR_MS = 5200;

type CanvasCenter = { x: number; y: number };
type RecenterTarget = { x: number; y: number; requestId: number };
type RevealState = {
  query: string;
  matchedNoteIds: string[];
  activeMatchIndex: number;
};

function findMatchingNoteIds(query: string, notes: SceneState['notes']): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return notes
    .filter((note) => `${note.title ?? ''}\n${note.body}`.toLowerCase().includes(q))
    .map((note) => note.id);
}

function getNoteCenter(note: { x: number; y: number }) {
  return { x: note.x + NOTE_WIDTH / 2, y: note.y + NOTE_HEIGHT / 2 };
}

export function useSceneController() {
  const [scene, setScene] = useState<SceneState>(loadScene);
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | RelationshipType>('all');
  const [recentlyClosedNoteId, setRecentlyClosedNoteId] = useState<string | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [lingeredNoteId, setLingeredNoteId] = useState<string | null>(null);
  const [pulseNoteId, setPulseNoteId] = useState<string | null>(null);
  const [lastActiveNoteId, setLastActiveNoteId] = useState<string | null>(null);
  const [recentNoteId, setRecentNoteId] = useState<string | null>(null);
  const [recentViewportCenter, setRecentViewportCenter] = useState<CanvasCenter | null>(null);
  const [recenterTarget, setRecenterTarget] = useState<RecenterTarget | null>(null);
  const [revealState, setRevealState] = useState<RevealState>({ query: '', matchedNoteIds: [], activeMatchIndex: 0 });
  const hoverTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const [, setTraceClock] = useState(0);

  const activeNote = useMemo(
    () => scene.notes.find((note) => note.id === scene.activeNoteId) ?? null,
    [scene.activeNoteId, scene.notes]
  );

  const activeRelationships = useMemo(() => {
    if (!activeNote) return [];
    return scene.relationships.filter(
      (relationship) => relationship.fromId === activeNote.id || relationship.toId === activeNote.id
    );
  }, [activeNote, scene.relationships]);

  const relationshipTotals = useMemo(
    () => ({
      related: activeRelationships.filter((relationship) => relationship.type === 'related_concept').length,
      references: activeRelationships.filter((relationship) => relationship.type === 'references').length
    }),
    [activeRelationships]
  );

  const rankedRelationships = useMemo(() => {
    if (!activeNote) return [];
    return getRankedRelationshipsForNote(activeNote.id, scene);
  }, [activeNote, scene]);

  const relationshipPanelItems = useMemo(() => {
    if (!activeNote) return [];
    const notesById = new Map(scene.notes.map((note) => [note.id, note]));

    return activeRelationships.map((relationship) => {
      const targetId = getRelationshipTargetNoteId(relationship, activeNote.id);
      return {
        id: relationship.id,
        targetId,
        targetTitle: notesById.get(targetId)
          ? getCompactDisplayTitle(notesById.get(targetId) as { title: string | null; body: string })
          : getCompactDisplayTitle({ title: null, body: '' }),
        type: relationship.type,
        explicitness: relationship.explicitness,
        state: relationship.state,
        explanation: relationship.explanation,
        heuristicSupported: relationship.heuristicSupported
      };
    });
  }, [activeNote, activeRelationships, scene.notes]);

  const visibleNotes = useMemo(() => applyLens(scene.notes, scene.lens), [scene.notes, scene.lens]);
  const archivedNotes = scene.notes.filter((note) => note.archived);
  const highestZ = scene.notes.reduce((acc, note) => Math.max(acc, note.z), 0);

  const visibleNoteIds = useMemo(() => new Set(visibleNotes.map((note) => note.id)), [visibleNotes]);

  const ambientRelatedNoteIds = useMemo(() => {
    if (!lingeredNoteId) return [];

    const direct = new Set<string>();
    for (const relationship of scene.relationships) {
      if (relationship.fromId === lingeredNoteId) direct.add(relationship.toId);
      if (relationship.toId === lingeredNoteId) direct.add(relationship.fromId);
    }

    return [...direct].filter((noteId) => noteId !== lingeredNoteId && visibleNoteIds.has(noteId));
  }, [lingeredNoteId, scene.relationships, visibleNoteIds]);

  const visibleRevealMatchIds = useMemo(
    () => revealState.matchedNoteIds.filter((noteId) => visibleNoteIds.has(noteId)),
    [revealState.matchedNoteIds, visibleNoteIds]
  );

  const revealActiveNoteId =
    visibleRevealMatchIds.length > 0
      ? visibleRevealMatchIds[revealState.activeMatchIndex % visibleRevealMatchIds.length]
      : null;

  const scheduleRevealClear = useCallback(() => {
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => {
      setRevealState((prev) => ({ ...prev, matchedNoteIds: [], activeMatchIndex: 0 }));
      revealTimerRef.current = null;
    }, REVEAL_CLEAR_MS);
  }, []);

  const cancelHoverIntent = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredNoteId(null);
    setLingeredNoteId(null);
  }, []);

  useEffect(() => {
    saveScene(scene);
  }, [scene]);

  useEffect(() => {
    const timer = window.setInterval(() => setTraceClock((tick) => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!recentlyClosedNoteId) return;
    const timer = window.setTimeout(() => setRecentlyClosedNoteId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [recentlyClosedNoteId]);

  useEffect(() => {
    if (!pulseNoteId) return;
    const timer = window.setTimeout(() => setPulseNoteId(null), 900);
    return () => window.clearTimeout(timer);
  }, [pulseNoteId]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    };
  }, []);

  const closeActiveNote = useCallback(() => {
    setRelationshipFilter('all');
    setScene((prev) => {
      if (prev.activeNoteId) setRecentlyClosedNoteId(prev.activeNoteId);
      return closeActiveNoteInScene(prev);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        const t = now();
        if (t - scene.lastCtrlTapTs <= CTRL_DOUBLE_TAP_MS) {
          setScene((prev) => ({
            ...prev,
            quickCaptureOpen: !prev.quickCaptureOpen,
            lastCtrlTapTs: 0
          }));
        } else {
          setScene((prev) => ({ ...prev, lastCtrlTapTs: t }));
        }
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setScene((prev) => ({ ...prev, quickCaptureOpen: true }));
      }

      if (event.key === 'Escape') {
        closeActiveNote();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeActiveNote, scene.lastCtrlTapTs]);

  const maybePanToCenter = useCallback(
    (targetCenter: CanvasCenter) => {
      if (recentViewportCenter) {
        const distance = Math.hypot(targetCenter.x - recentViewportCenter.x, targetCenter.y - recentViewportCenter.y);
        if (distance <= NEARBY_CONTEXT_DISTANCE_PX) return;
      }

      setRecenterTarget({ x: targetCenter.x, y: targetCenter.y, requestId: Date.now() });
    },
    [recentViewportCenter]
  );

  const updateNote = useCallback((id: string, updates: Parameters<typeof updateNoteInScene>[2], trace?: string) => {
    setScene((prev) => updateNoteInScene(prev, id, updates, trace));
  }, []);

  const bringToFront = useCallback(
    (id: string) => {
      cancelHoverIntent();
      setScene((prev) => bringNoteToFrontInScene(prev, id));
    },
    [cancelHoverIntent]
  );

  const setLens = useCallback(
    (lens: Lens) => {
      cancelHoverIntent();
      setScene((prev) => setLensInScene(prev, lens));
    },
    [cancelHoverIntent]
  );

  const createExplicitRelationship = useCallback((fromId: string, toId: string, type: RelationshipType) => {
    setScene((prev) => createExplicitRelationshipInScene(prev, fromId, toId, type));
  }, []);

  const confirmRelationship = useCallback((relationshipId: string) => {
    setScene((prev) => confirmRelationshipInScene(prev, relationshipId));
  }, []);

  const traverseToRelated = useCallback(
    (targetNoteId: string, relationshipId: string) => {
      if (lastActiveNoteId) setRecentNoteId(lastActiveNoteId);
      setLastActiveNoteId(targetNoteId);
      setScene((prev) => traverseToRelatedInScene(prev, targetNoteId, relationshipId));
    },
    [lastActiveNoteId]
  );

  const toggleQuickCapture = useCallback(() => {
    setScene((prev) => ({ ...prev, quickCaptureOpen: !prev.quickCaptureOpen }));
  }, []);

  const onCanvasScroll = useCallback((left: number, top: number) => {
    setScene((prev) => setCanvasScrollInScene(prev, left, top));
  }, []);

  const onViewportCenterChange = useCallback((x: number, y: number) => {
    setRecentViewportCenter({ x, y });
  }, []);

  const onOpenNote = useCallback(
    (id: string) => {
      cancelHoverIntent();
      setRecentlyClosedNoteId(null);
      if (lastActiveNoteId && lastActiveNoteId !== id) setRecentNoteId(lastActiveNoteId);
      setLastActiveNoteId(id);
      const targetNote = scene.notes.find((note) => note.id === id);
      if (targetNote) {
        setRecentViewportCenter(getNoteCenter(targetNote));
      }
      setScene((prev) => openNoteInScene(prev, id));
      updateNote(id, {}, 'focused');
    },
    [cancelHoverIntent, lastActiveNoteId, scene.notes, updateNote]
  );

  const onArchiveNote = useCallback((id: string) => {
    setRecentlyClosedNoteId(id);
    setScene((prev) => archiveNoteInScene(prev, id));
  }, []);

  const toggleNoteFocus = useCallback((id: string) => {
    setScene((prev) => toggleNoteFocusInScene(prev, id));
  }, []);

  const onHoverStart = useCallback((id: string) => {
    setHoveredNoteId(id);
    setLingeredNoteId(null);
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      setLingeredNoteId(id);
      hoverTimerRef.current = null;
    }, HOVER_LINGER_MS);
  }, []);

  const onHoverEnd = useCallback((id: string) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredNoteId((current) => (current === id ? null : current));
    setLingeredNoteId((current) => (current === id ? null : current));
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

  const onRevealQueryChange = useCallback((query: string) => {
    setRevealState((prev) => ({ ...prev, query }));
  }, []);

  const onReveal = useCallback(() => {
    const matches = findMatchingNoteIds(revealState.query, visibleNotes);
    setRevealState((prev) => ({ ...prev, matchedNoteIds: matches, activeMatchIndex: 0 }));

    if (matches.length === 0) return;

    const matchNotes = visibleNotes.filter((note) => matches.includes(note.id));
    const centers = matchNotes.map((note) => getNoteCenter(note));
    const minX = Math.min(...centers.map((point) => point.x));
    const maxX = Math.max(...centers.map((point) => point.x));
    const minY = Math.min(...centers.map((point) => point.y));
    const maxY = Math.max(...centers.map((point) => point.y));

    maybePanToCenter({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
    scheduleRevealClear();
  }, [maybePanToCenter, revealState.query, scheduleRevealClear, visibleNotes]);

  const onRevealStep = useCallback(
    (direction: -1 | 1) => {
      if (visibleRevealMatchIds.length < 2) return;
      const nextIndex = (revealState.activeMatchIndex + direction + visibleRevealMatchIds.length) % visibleRevealMatchIds.length;
      const nextId = visibleRevealMatchIds[nextIndex];
      const targetNote = visibleNotes.find((note) => note.id === nextId);
      if (targetNote) {
        maybePanToCenter(getNoteCenter(targetNote));
      }
      setRevealState((prev) => ({ ...prev, activeMatchIndex: nextIndex }));
      scheduleRevealClear();
    },
    [maybePanToCenter, revealState.activeMatchIndex, scheduleRevealClear, visibleNotes, visibleRevealMatchIds]
  );

  const onRevealNext = useCallback(() => onRevealStep(1), [onRevealStep]);
  const onRevealPrev = useCallback(() => onRevealStep(-1), [onRevealStep]);

  const onCapture = useCallback(
    (text: string) => {
      setScene((prev) => {
        const notes = [...prev.notes, createNote(text, highestZ + 1)];
        return {
          ...prev,
          notes,
          relationships: refreshInferredRelationships(notes, prev.relationships, now())
        };
      });
    },
    [highestZ]
  );

  return {
    scene,
    activeNote,
    visibleNotes,
    archivedNotes,
    hoveredNoteId,
    relationshipFilter,
    recentlyClosedNoteId,
    rankedRelationships,
    relationshipPanelItems,
    relationshipTotals,
    ambientRelatedNoteIds,
    pulseNoteId,
    recenterTarget,
    revealState,
    visibleRevealMatchIds,
    revealActiveNoteId,
    setRelationshipFilter,
    closeActiveNote,
    updateNote,
    bringToFront,
    setLens,
    createExplicitRelationship,
    confirmRelationship,
    traverseToRelated,
    toggleNoteFocus,
    toggleQuickCapture,
    onCanvasScroll,
    onViewportCenterChange,
    onOpenNote,
    onArchiveNote,
    onCapture,
    onHoverStart,
    onHoverEnd,
    onWhereWasI,
    onRevealQueryChange,
    onReveal,
    onRevealNext,
    onRevealPrev
  };
}
