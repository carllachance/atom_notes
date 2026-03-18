import { NoteCardModel, Relationship } from '../types';

export type CanvasVisualStage =
  | 'rest-primary'
  | 'rest-muted'
  | 'hover-focus'
  | 'hover-context'
  | 'selection-focus'
  | 'selection-context'
  | 'drag-focus'
  | 'drag-context'
  | 'reveal-focus'
  | 'reveal-context'
  | 'reveal-muted';

export type CanvasVisualState = {
  stage: CanvasVisualStage;
  showSummary: boolean;
  showTrace: boolean;
  opacityMultiplier: number;
};

export type CanvasVisibilityContext = {
  activeNoteId: string | null;
  hoveredNoteId: string | null;
  draggingNoteId: string | null;
  revealMatchedNoteIds: string[];
  revealActiveNoteId: string | null;
  relatedHoverNoteIds: string[];
  selectedContextNoteIds: string[];
};

const DEFAULT_PRIMARY_LIMIT = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function recencyBoost(note: NoteCardModel, nowTs: number) {
  const ageHours = Math.max(0, (nowTs - note.updatedAt) / (1000 * 60 * 60));
  return clamp(1.15 - ageHours / 36, 0.32, 1.15);
}

function noteRelationshipWeight(noteId: string, relationships: Relationship[]) {
  return relationships.reduce((score, relationship) => {
    if (relationship.fromId !== noteId && relationship.toId !== noteId) return score;

    const explicitBoost = relationship.explicitness === 'explicit' ? 1.25 : 0.78;
    const stateBoost = relationship.state === 'confirmed' ? 1.15 : 0.85;
    const typeBoost = relationship.type === 'references' ? 1.05 : 1;
    return score + explicitBoost * stateBoost * typeBoost * relationship.confidence;
  }, 0);
}

export function getDefaultPrimaryNoteIds(notes: NoteCardModel[], relationships: Relationship[], nowTs = Date.now()) {
  return notes
    .filter((note) => !note.archived)
    .map((note) => ({
      id: note.id,
      score:
        noteRelationshipWeight(note.id, relationships) +
        recencyBoost(note, nowTs) +
        (note.inFocus ? 1.4 : 0) +
        (note.trace === 'focused' ? 0.9 : note.trace === 'captured' || note.trace === 'refined' ? 0.45 : 0)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    })
    .slice(0, DEFAULT_PRIMARY_LIMIT)
    .map((item) => item.id);
}

export function getCanvasVisualState(
  note: NoteCardModel,
  defaultPrimaryNoteIds: Set<string>,
  context: CanvasVisibilityContext
): CanvasVisualState {
  const revealMatches = new Set(context.revealMatchedNoteIds);
  const hoverContext = new Set(context.relatedHoverNoteIds);
  const selectionContext = new Set(context.selectedContextNoteIds);

  if (context.revealActiveNoteId === note.id) {
    return { stage: 'reveal-focus', showSummary: true, showTrace: true, opacityMultiplier: 1.08 };
  }

  if (revealMatches.size > 0) {
    if (revealMatches.has(note.id)) {
      return { stage: 'reveal-context', showSummary: true, showTrace: true, opacityMultiplier: 1.02 };
    }

    return { stage: 'reveal-muted', showSummary: false, showTrace: false, opacityMultiplier: 0.52 };
  }

  if (context.draggingNoteId === note.id) {
    return { stage: 'drag-focus', showSummary: true, showTrace: true, opacityMultiplier: 1.08 };
  }

  if (context.draggingNoteId && selectionContext.has(note.id)) {
    return { stage: 'drag-context', showSummary: true, showTrace: false, opacityMultiplier: 0.88 };
  }

  if (context.activeNoteId === note.id) {
    return { stage: 'selection-focus', showSummary: true, showTrace: true, opacityMultiplier: 1.06 };
  }

  if (context.activeNoteId && selectionContext.has(note.id)) {
    return { stage: 'selection-context', showSummary: true, showTrace: true, opacityMultiplier: 0.94 };
  }

  if (context.hoveredNoteId === note.id) {
    return { stage: 'hover-focus', showSummary: true, showTrace: true, opacityMultiplier: 1.02 };
  }

  if (context.hoveredNoteId && hoverContext.has(note.id)) {
    return { stage: 'hover-context', showSummary: true, showTrace: false, opacityMultiplier: 0.9 };
  }

  if (defaultPrimaryNoteIds.has(note.id) || note.inFocus) {
    return { stage: 'rest-primary', showSummary: true, showTrace: false, opacityMultiplier: 0.92 };
  }

  return { stage: 'rest-muted', showSummary: false, showTrace: false, opacityMultiplier: 0.72 };
}
