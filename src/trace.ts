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
  blur: number;
  lift: number;
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
      scale: 0.976,
      opacity: clamp(0.56 - ageFade * 0.1, 0.42, 0.56),
      emphasis: 0.12,
      blur: clamp(0.4 + ageFade * 0.8, 0.4, 1.2),
      lift: -2
    };
  }

  const activeBoost =
    note.trace === 'focused'
      ? 0.036
      : note.trace === 'captured' || note.trace === 'restored'
        ? 0.028
        : note.trace === 'refined' || note.trace === 'moved'
          ? 0.018
          : 0;

  return {
    scale: clamp(0.988 + activeBoost - ageFade * 0.02, 0.96, 1.034),
    opacity: clamp(0.76 + activeBoost * 1.25 - ageFade * 0.2, 0.48, 0.9),
    emphasis: clamp(0.2 + activeBoost * 1.35 - ageFade * 0.1, 0.08, 0.36),
    blur: clamp(ageFade * 0.9 - activeBoost * 3, 0, 0.85),
    lift: clamp(5 + activeBoost * 180 - ageFade * 8, 0, 12)
  };
}

export function describeNoteTrace(note: Pick<NoteCardModel, 'trace' | 'updatedAt' | 'archived'>): string {
  return semanticTrace(note.trace, note.updatedAt, note.archived);
}
