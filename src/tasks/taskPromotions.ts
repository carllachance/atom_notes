import { NoteCardModel, TaskState } from '../types';

export type ResolvedTaskFragment = {
  id: string;
  taskNoteId: string;
  start: number;
  end: number;
  text: string;
  stale: boolean;
};

function clampOffset(value: number, source: string) {
  return Math.max(0, Math.min(value, source.length));
}

function findNearestText(source: string, quote: string, preferredStart: number) {
  if (!quote.trim()) return null;
  const matches: number[] = [];
  let cursor = source.indexOf(quote);
  while (cursor !== -1) {
    matches.push(cursor);
    cursor = source.indexOf(quote, cursor + 1);
  }
  if (!matches.length) return null;
  return matches.sort((a, b) => Math.abs(a - preferredStart) - Math.abs(b - preferredStart))[0] ?? null;
}

export function resolveTaskFragment(body: string, fragment: NonNullable<NoteCardModel['promotedTaskFragments']>[number]): ResolvedTaskFragment {
  const expectedText = fragment.text;
  const safeStart = clampOffset(fragment.start, body);
  const safeEnd = clampOffset(fragment.end, body);
  const directSlice = body.slice(safeStart, safeEnd);

  if (directSlice === expectedText) {
    return { ...fragment, start: safeStart, end: safeEnd, stale: false };
  }

  const nearestStart = findNearestText(body, expectedText, safeStart);
  if (nearestStart != null) {
    return {
      ...fragment,
      start: nearestStart,
      end: nearestStart + expectedText.length,
      stale: true
    };
  }

  const fallbackStart = safeStart;
  const fallbackText = directSlice || expectedText;
  return {
    ...fragment,
    start: fallbackStart,
    end: fallbackStart + fallbackText.length,
    text: fallbackText,
    stale: true
  };
}

export function getResolvedTaskFragments(note: Pick<NoteCardModel, 'body' | 'promotedTaskFragments'>): ResolvedTaskFragment[] {
  return (note.promotedTaskFragments ?? [])
    .map((fragment) => resolveTaskFragment(note.body, fragment))
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

export function getTaskStateLabel(taskState: TaskState | undefined) {
  return taskState === 'done' ? 'Done' : 'Open';
}
