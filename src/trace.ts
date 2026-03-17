import { NoteCardModel } from './types';

const TRACE_LABELS: Record<string, string> = {
  captured: 'Fresh thought',
  moved: 'Shifted',
  focused: 'In focus',
  refined: 'Still shaping',
  archive: 'Tucked away',
  restored: 'Back in orbit',
  idle: 'Present'
};

export function semanticTrace(kind: string | undefined, updatedAt: number, archived: boolean): string {
  const ageMs = Date.now() - updatedAt;

  if (archived && ageMs > 5 * 60_000) return 'At rest';
  if (ageMs > 20 * 60_000) return archived ? 'Stored' : 'Quiet';
  if (ageMs > 5 * 60_000) return archived ? 'Settled away' : 'Settled';

  return TRACE_LABELS[kind ?? 'idle'] ?? TRACE_LABELS.idle;
}

export function describeNoteTrace(note: Pick<NoteCardModel, 'trace' | 'updatedAt' | 'archived'>): string {
  return semanticTrace(note.trace, note.updatedAt, note.archived);
}
