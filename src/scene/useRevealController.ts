import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NoteCardModel } from '../types';

const REVEAL_CLEAR_MS = 5200;
const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 170;

type CanvasCenter = { x: number; y: number };

type RevealState = {
  query: string;
  matchedNoteIds: string[];
  activeMatchIndex: number;
};

type UseRevealControllerOptions = {
  visibleNotes: NoteCardModel[];
  visibleNoteIds: Set<string>;
  panToCenterIfFar: (targetCenter: CanvasCenter) => void;
};

export function findMatchingNoteIds(query: string, notes: NoteCardModel[]): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return notes
    .filter((note) => `${note.title ?? ''}\n${note.body}`.toLowerCase().includes(normalized))
    .map((note) => note.id);
}

function getNoteCenter(note: { x: number; y: number }): CanvasCenter {
  return { x: note.x + NOTE_WIDTH / 2, y: note.y + NOTE_HEIGHT / 2 };
}

export function useRevealController({ visibleNotes, visibleNoteIds, panToCenterIfFar }: UseRevealControllerOptions) {
  const [revealState, setRevealState] = useState<RevealState>({ query: '', matchedNoteIds: [], activeMatchIndex: 0 });
  const revealTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    };
  }, []);

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

    panToCenterIfFar({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
    scheduleRevealClear();
  }, [panToCenterIfFar, revealState.query, scheduleRevealClear, visibleNotes]);

  const onRevealStep = useCallback(
    (direction: -1 | 1) => {
      if (visibleRevealMatchIds.length < 2) return;
      const nextIndex = (revealState.activeMatchIndex + direction + visibleRevealMatchIds.length) % visibleRevealMatchIds.length;
      const nextId = visibleRevealMatchIds[nextIndex];
      const targetNote = visibleNotes.find((note) => note.id === nextId);
      if (targetNote) {
        panToCenterIfFar(getNoteCenter(targetNote));
      }
      setRevealState((prev) => ({ ...prev, activeMatchIndex: nextIndex }));
      scheduleRevealClear();
    },
    [panToCenterIfFar, revealState.activeMatchIndex, scheduleRevealClear, visibleNotes, visibleRevealMatchIds]
  );

  const onRevealNext = useCallback(() => onRevealStep(1), [onRevealStep]);
  const onRevealPrev = useCallback(() => onRevealStep(-1), [onRevealStep]);

  return {
    revealState,
    visibleRevealMatchIds,
    revealActiveNoteId,
    onRevealQueryChange,
    onReveal,
    onRevealNext,
    onRevealPrev
  };
}
