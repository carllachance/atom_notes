import { NoteCardModel } from '../types';

export type CanvasCenter = { x: number; y: number };
export type CanvasBounds = { minX: number; maxX: number; minY: number; maxY: number };
export type OrientationTarget = CanvasCenter & { pulseNoteId?: string | null };

const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 170;
const MIN_CLUSTER_NOTES = 2;

export function getNoteCenter(note: Pick<NoteCardModel, 'x' | 'y'>): CanvasCenter {
  return { x: note.x + NOTE_WIDTH / 2, y: note.y + NOTE_HEIGHT / 2 };
}

export function getBoundsCenter(bounds: CanvasBounds): CanvasCenter {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  };
}

export function getNotesBounds(notes: Pick<NoteCardModel, 'x' | 'y'>[]): CanvasBounds | null {
  if (notes.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const note of notes) {
    minX = Math.min(minX, note.x);
    minY = Math.min(minY, note.y);
    maxX = Math.max(maxX, note.x + NOTE_WIDTH);
    maxY = Math.max(maxY, note.y + NOTE_HEIGHT);
  }

  return { minX, minY, maxX, maxY };
}

export function getSelectedClusterTarget(
  activeNoteId: string | null,
  visibleNotes: NoteCardModel[],
  selectedContextNoteIds: string[]
): OrientationTarget | null {
  if (!activeNoteId) return null;

  const clusterNotes = visibleNotes.filter((note) => note.id === activeNoteId || selectedContextNoteIds.includes(note.id));
  if (clusterNotes.length < MIN_CLUSTER_NOTES) {
    const activeNote = visibleNotes.find((note) => note.id === activeNoteId);
    return activeNote ? { ...getNoteCenter(activeNote), pulseNoteId: activeNote.id } : null;
  }

  const bounds = getNotesBounds(clusterNotes);
  if (!bounds) return null;
  return { ...getBoundsCenter(bounds), pulseNoteId: activeNoteId };
}

export function getResetViewTarget(visibleNotes: NoteCardModel[]): OrientationTarget | null {
  const bounds = getNotesBounds(visibleNotes);
  if (!bounds) return null;
  return { ...getBoundsCenter(bounds), pulseNoteId: null };
}
