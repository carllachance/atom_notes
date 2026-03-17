import { NoteCardModel } from './types';

const TRACE_LABELS: Record<string, string> = {
  captured: 'Just captured',
  moved: 'Recently repositioned',
  focused: 'In active focus',
  refined: 'Recently refined',
  archive: 'Archived recently',
  restored: 'Re-entered canvas',
  idle: 'Stable on canvas'
};

type TraceVisualBias = {
  scale: number;
  opacity: number;
  emphasis: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function semanticTrace(kind: string | undefined, updatedAt: number, archived: boolean): string {
  const ageMs = Date.now() - updatedAt;

  if (archived && ageMs > 20 * 60_000) return 'Archive resting';
  if (archived && ageMs > 5 * 60_000) return 'Archive settled';
  if (ageMs > 20 * 60_000) return 'Low activity';
  if (ageMs > 5 * 60_000) return 'Cooling down';

  return TRACE_LABELS[kind ?? 'idle'] ?? TRACE_LABELS.idle;
}

export function getTraceVisualBias(note: Pick<NoteCardModel, 'trace' | 'updatedAt' | 'archived'>): TraceVisualBias {
  const ageMs = Date.now() - note.updatedAt;
  const ageFade = clamp(ageMs / (30 * 60_000), 0, 1);

  if (note.archived) {
    return {
      scale: 0.972,
      opacity: 0.62 - ageFade * 0.1,
      emphasis: 0.22
    };
  }

  const activeBoost =
    note.trace === 'focused'
      ? 0.08
      : note.trace === 'captured' || note.trace === 'restored'
        ? 0.06
        : note.trace === 'refined' || note.trace === 'moved'
          ? 0.04
          : 0;

  return {
    scale: 0.986 + activeBoost * 0.24 - ageFade * 0.02,
    opacity: 0.76 + activeBoost * 1.4 - ageFade * 0.16,
    emphasis: 0.32 + activeBoost * 1.7 - ageFade * 0.12
  };
}

export function describeNoteTrace(note: Pick<NoteCardModel, 'trace' | 'updatedAt' | 'archived'>): string {
  return semanticTrace(note.trace, note.updatedAt, note.archived);
}
