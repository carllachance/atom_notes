import { useCallback, useEffect, useMemo, useState } from 'react';
import { NoteCardModel } from '../types';

const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 170;

type CanvasCenter = { x: number; y: number };

type UseRevealControllerOptions = {
  visibleNotes: NoteCardModel[];
  activeRevealQuery: string;
  onApplyReveal: (query: string) => void;
  panToCenterIfFar: (targetCenter: CanvasCenter) => void;
};

function getNoteCenter(note: { x: number; y: number }): CanvasCenter {
  return { x: note.x + NOTE_WIDTH / 2, y: note.y + NOTE_HEIGHT / 2 };
}

export function useRevealController({ visibleNotes, activeRevealQuery, onApplyReveal, panToCenterIfFar }: UseRevealControllerOptions) {
  const [draftQuery, setDraftQuery] = useState(activeRevealQuery);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  useEffect(() => {
    setDraftQuery(activeRevealQuery);
    setActiveMatchIndex(0);
  }, [activeRevealQuery]);

  const visibleRevealMatchIds = useMemo(
    () => (activeRevealQuery ? visibleNotes.map((note) => note.id) : []),
    [activeRevealQuery, visibleNotes]
  );

  const revealActiveNoteId =
    visibleRevealMatchIds.length > 0 ? visibleRevealMatchIds[activeMatchIndex % visibleRevealMatchIds.length] : null;

  const onRevealQueryChange = useCallback((query: string) => {
    setDraftQuery(query);
  }, []);

  const onReveal = useCallback(() => {
    const query = draftQuery.trim();
    onApplyReveal(query);
    setActiveMatchIndex(0);

    if (!query || visibleNotes.length === 0) return;

    const centers = visibleNotes.map((note) => getNoteCenter(note));
    const minX = Math.min(...centers.map((point) => point.x));
    const maxX = Math.max(...centers.map((point) => point.x));
    const minY = Math.min(...centers.map((point) => point.y));
    const maxY = Math.max(...centers.map((point) => point.y));

    panToCenterIfFar({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
  }, [draftQuery, onApplyReveal, panToCenterIfFar, visibleNotes]);

  const onRevealStep = useCallback(
    (direction: -1 | 1) => {
      if (visibleRevealMatchIds.length < 2) return;
      const nextIndex = (activeMatchIndex + direction + visibleRevealMatchIds.length) % visibleRevealMatchIds.length;
      const nextId = visibleRevealMatchIds[nextIndex];
      const targetNote = visibleNotes.find((note) => note.id === nextId);
      if (targetNote) panToCenterIfFar(getNoteCenter(targetNote));
      setActiveMatchIndex(nextIndex);
    },
    [activeMatchIndex, panToCenterIfFar, visibleNotes, visibleRevealMatchIds]
  );

  return {
    revealState: {
      query: draftQuery,
      matchedNoteIds: visibleRevealMatchIds,
      activeMatchIndex
    },
    visibleRevealMatchIds,
    revealActiveNoteId,
    onRevealQueryChange,
    onReveal,
    onRevealNext: () => onRevealStep(1),
    onRevealPrev: () => onRevealStep(-1)
  };
}
