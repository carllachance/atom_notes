import { CSSProperties } from 'react';
import { getTraceVisualBias } from '../trace';
import { NoteCardModel } from '../types';

export const NOTE_CARD_WIDTH = 270;
export const NOTE_CARD_HEIGHT = 124;
export const RELATED_NODE_OFFSET_X = 95;
export const RELATED_NODE_OFFSET_Y = 44;

type PositionedNote = Pick<NoteCardModel, 'x' | 'y' | 'trace' | 'updatedAt' | 'archived'>;

export type CanvasViewportMetrics = {
  left: number;
  top: number;
  scrollLeft: number;
  scrollTop: number;
  width: number;
  height: number;
};

export function getNoteVisualFrame(note: PositionedNote) {
  const bias = getTraceVisualBias(note);

  return {
    x: note.x,
    y: note.y - bias.lift,
    width: NOTE_CARD_WIDTH * bias.scale,
    height: NOTE_CARD_HEIGHT * bias.scale,
    scale: bias.scale,
    lift: bias.lift
  };
}

export function getNoteCenter(note: PositionedNote) {
  const frame = getNoteVisualFrame(note);
  return {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2
  };
}

export function buildRelationshipEdgePath(activeNote: PositionedNote, targetNote: PositionedNote) {
  const activeCenter = getNoteCenter(activeNote);
  const targetCenter = getNoteCenter(targetNote);
  const horizontalDistance = Math.abs(targetCenter.x - activeCenter.x);
  const verticalDirection = targetCenter.y >= activeCenter.y ? 1 : -1;
  const controlOffset = Math.max(30, horizontalDistance * 0.18);

  return [
    `M ${activeCenter.x} ${activeCenter.y}`,
    `C ${activeCenter.x} ${activeCenter.y + controlOffset * verticalDirection},`,
    `${targetCenter.x} ${targetCenter.y - controlOffset * verticalDirection},`,
    `${targetCenter.x} ${targetCenter.y}`
  ].join(' ');
}

export function getRelationshipWebPlaneStyle(metrics: CanvasViewportMetrics | null): CSSProperties | undefined {
  if (!metrics) return undefined;

  return {
    transform: `translate(${metrics.left - metrics.scrollLeft}px, ${metrics.top - metrics.scrollTop}px)`
  };
}

export function getRelatedNodeStyle(note: PositionedNote): CSSProperties {
  const frame = getNoteVisualFrame(note);
  return {
    transform: `translate(${frame.x + RELATED_NODE_OFFSET_X * frame.scale}px, ${frame.y + RELATED_NODE_OFFSET_Y * frame.scale}px)`
  };
}

export function getNotesBoundingBox(notes: PositionedNote[]) {
  if (notes.length === 0) return null;

  const frames = notes.map((note) => getNoteVisualFrame(note));
  const left = Math.min(...frames.map((frame) => frame.x));
  const top = Math.min(...frames.map((frame) => frame.y));
  const right = Math.max(...frames.map((frame) => frame.x + frame.width));
  const bottom = Math.max(...frames.map((frame) => frame.y + frame.height));

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

export function countNotesInViewport(notes: PositionedNote[], metrics: CanvasViewportMetrics) {
  const viewportLeft = metrics.scrollLeft;
  const viewportTop = metrics.scrollTop;
  const viewportRight = viewportLeft + metrics.width;
  const viewportBottom = viewportTop + metrics.height;

  return notes.reduce((count, note) => {
    const frame = getNoteVisualFrame(note);
    const intersects =
      frame.x < viewportRight &&
      frame.x + frame.width > viewportLeft &&
      frame.y < viewportBottom &&
      frame.y + frame.height > viewportTop;

    return intersects ? count + 1 : count;
  }, 0);
}
