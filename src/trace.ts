import { NoteCardModel } from './types';

const TRACE_LABELS: Record<string, string> = {
  captured: 'Captured just now',
  moved: 'Moved just now',
  focused: 'In focus',
  refined: 'Edited just now',
  archive: 'Archived',
  restored: 'Restored to canvas',
  idle: 'On canvas'
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

  if (archived) return ageMs > 5 * 60_000 ? 'Archived' : 'Archived just now';
  if (ageMs > 20 * 60_000) return 'On canvas';
  if (ageMs > 5 * 60_000) return 'Recent activity';

  return TRACE_LABELS[kind ?? 'idle'] ?? TRACE_LABELS.idle;
}

export function getTraceVisualBias(note: Pick<NoteCardModel, 'trace' | 'updatedAt' | 'archived'>): TraceVisualBias {
  const ageMs = Date.now() - note.updatedAt;
  const ageFade = clamp(ageMs / (30 * 60_000), 0, 1);

  if (note.archived) {
    return {
      scale: 0.99,
      opacity: clamp(0.7 - ageFade * 0.08, 0.58, 0.7),
      emphasis: 0.08,
      blur: clamp(0.2 + ageFade * 0.4, 0.2, 0.6),
      lift: 0
    };
  }

  const activeBoost = note.trace === 'focused' ? 0.012 : note.trace === 'captured' || note.trace === 'restored' ? 0.01 : 0.006;

  return {
    scale: clamp(0.995 + activeBoost - ageFade * 0.008, 0.98, 1.01),
    opacity: clamp(0.84 + activeBoost * 0.8 - ageFade * 0.12, 0.66, 0.9),
    emphasis: clamp(0.14 + activeBoost * 1.2 - ageFade * 0.06, 0.08, 0.2),
    blur: clamp(ageFade * 0.4 - activeBoost * 1.4, 0, 0.4),
    lift: clamp(2 + activeBoost * 40 - ageFade * 2, 0, 3)
  };
}

export function describeNoteTrace(note: Pick<NoteCardModel, 'trace' | 'updatedAt' | 'archived'>): string {
  return semanticTrace(note.trace, note.updatedAt, note.archived);
}
