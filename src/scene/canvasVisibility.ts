import { CanvasViewportMetrics, countNotesInViewport, getNotesBoundingBox } from '../components/relationshipWebGeometry';
import { LensPresentation } from './lens';
import { NoteCardModel, SceneState } from '../types';

export type CanvasVisibilitySummary = {
  totalActiveNotes: number;
  lensEligibleNotes: number;
  visibleNotes: number;
  hiddenByFocusCount: number;
  notesInViewport: number;
  hasVisibleUniverse: boolean;
  isBlankBecauseOfFocus: boolean;
  isBlankBecauseOfFilters: boolean;
  isBlankBecauseNotesAreOffCanvas: boolean;
  shouldShowRecoveryHelper: boolean;
};

function getActiveNotes(notes: NoteCardModel[]) {
  return notes.filter((note) => !note.archived && !note.deleted);
}

export function summarizeCanvasVisibility(
  scene: Pick<SceneState, 'notes' | 'focusMode'>,
  lensPresentation: Pick<LensPresentation, 'visibleNotes'>,
  visibleNotes: NoteCardModel[],
  canvasMetrics: CanvasViewportMetrics | null
): CanvasVisibilitySummary {
  const totalActiveNotes = getActiveNotes(scene.notes).length;
  const lensEligibleNotes = lensPresentation.visibleNotes.length;
  const hiddenByFocusCount = Math.max(0, lensEligibleNotes - visibleNotes.length);
  const notesInViewport = canvasMetrics ? countNotesInViewport(visibleNotes, canvasMetrics) : visibleNotes.length;
  const hasVisibleUniverse = totalActiveNotes > 0;
  const isBlankBecauseOfFocus = visibleNotes.length === 0 && hiddenByFocusCount > 0 && scene.focusMode.isolate;
  const isBlankBecauseOfFilters = visibleNotes.length === 0 && lensEligibleNotes === 0 && totalActiveNotes > 0;
  const isBlankBecauseNotesAreOffCanvas = visibleNotes.length > 0 && notesInViewport === 0;

  return {
    totalActiveNotes,
    lensEligibleNotes,
    visibleNotes: visibleNotes.length,
    hiddenByFocusCount,
    notesInViewport,
    hasVisibleUniverse,
    isBlankBecauseOfFocus,
    isBlankBecauseOfFilters,
    isBlankBecauseNotesAreOffCanvas,
    shouldShowRecoveryHelper:
      totalActiveNotes > 0 &&
      (visibleNotes.length === 0 || isBlankBecauseNotesAreOffCanvas)
  };
}

export function getCanvasRecoveryCenter(notes: NoteCardModel[]) {
  const bounds = getNotesBoundingBox(notes);
  if (!bounds) return null;

  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2
  };
}
