import { NoteCardModel } from '../types';

const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 170;
const OFFSETS = [
  { x: 0, y: 0 },
  { x: 46, y: 24 },
  { x: -54, y: 28 },
  { x: 62, y: -36 },
  { x: -76, y: -18 },
  { x: 108, y: 48 },
  { x: -118, y: 52 },
  { x: 132, y: -54 }
];

function intersects(a: { x: number; y: number }, b: { x: number; y: number }) {
  return !(a.x + NOTE_WIDTH < b.x || b.x + NOTE_WIDTH < a.x || a.y + NOTE_HEIGHT < b.y || b.y + NOTE_HEIGHT < a.y);
}

export function resolveCapturePlacement(
  notes: NoteCardModel[],
  center: { x: number; y: number },
  activeNote: NoteCardModel | null,
  seed: number
) {
  const sortedOffsets = OFFSETS.map((offset, index) => ({ ...offset, index: (index + seed) % OFFSETS.length })).sort((a, b) => a.index - b.index);
  const activeRect = activeNote ? { x: activeNote.x, y: activeNote.y } : null;

  for (const offset of sortedOffsets) {
    const candidate = { x: Math.max(32, center.x - NOTE_WIDTH / 2 + offset.x), y: Math.max(32, center.y - NOTE_HEIGHT / 2 + offset.y) };
    if (activeRect && intersects(candidate, activeRect)) continue;
    if (notes.some((note) => !note.archived && intersects(candidate, { x: note.x, y: note.y }))) continue;
    return candidate;
  }

  const fallback = sortedOffsets[0] ?? { x: 0, y: 0 };
  return { x: Math.max(32, center.x - NOTE_WIDTH / 2 + fallback.x), y: Math.max(32, center.y - NOTE_HEIGHT / 2 + fallback.y) };
}
