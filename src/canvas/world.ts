import { NoteCardModel } from '../types';

export const WORLD_MARGIN = 4200;
export const WORLD_MIN_SIZE = 9600;
export const NOTE_CARD_WIDTH = 270;
export const NOTE_CARD_HEIGHT = 170;

export function getCanvasWorldBounds(notes: NoteCardModel[]) {
  if (notes.length === 0) {
    return {
      width: WORLD_MIN_SIZE,
      height: WORLD_MIN_SIZE,
      offsetX: WORLD_MARGIN,
      offsetY: WORLD_MARGIN
    };
  }

  const minX = Math.min(...notes.map((note) => note.x));
  const minY = Math.min(...notes.map((note) => note.y));
  const maxX = Math.max(...notes.map((note) => note.x + NOTE_CARD_WIDTH));
  const maxY = Math.max(...notes.map((note) => note.y + NOTE_CARD_HEIGHT));

  return {
    width: Math.max(WORLD_MIN_SIZE, maxX - minX + WORLD_MARGIN * 2),
    height: Math.max(WORLD_MIN_SIZE, maxY - minY + WORLD_MARGIN * 2),
    offsetX: WORLD_MARGIN - minX,
    offsetY: WORLD_MARGIN - minY
  };
}
