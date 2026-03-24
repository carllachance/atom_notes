import { NoteCardModel } from '../types';
import { HistoryStackEntry, StateSnapshot } from '../types/reeentory';

export type MemorySummaryResult = {
  summary: string | null;
  source: 'ai-generated' | 'ai-inferred' | null;
};

function compactTitle(note: NoteCardModel | undefined, fallback: string | null): string {
  if (note?.title?.trim()) return note.title.trim();
  if (note?.body?.trim()) return note.body.trim().slice(0, 42);
  return fallback ?? 'untitled note';
}

export function buildMemorySummary(
  history: HistoryStackEntry[],
  bookmarks: StateSnapshot[],
  notes: NoteCardModel[],
  activeNoteId: string | null
): MemorySummaryResult {
  if (!history.length && !bookmarks.length && !activeNoteId) {
    return { summary: null, source: null };
  }

  const notesById = new Map(notes.map((note) => [note.id, note]));
  const recentHistory = history.slice(0, 3);
  const recentTitles = recentHistory.map((entry) => compactTitle(notesById.get(entry.noteId ?? ''), entry.noteTitle));
  const activeTitle = activeNoteId ? compactTitle(notesById.get(activeNoteId), 'active note') : null;
  const bookmarkLabel = bookmarks[0]?.label;

  const lines: string[] = [];
  if (activeTitle) lines.push(`You are in ${activeTitle}.`);
  if (recentTitles.length) lines.push(`Recent path: ${recentTitles.join(' → ')}.`);
  if (bookmarkLabel) lines.push(`Latest pin: ${bookmarkLabel}.`);

  return {
    summary: lines.join(' ').trim() || null,
    source: lines.length ? 'ai-inferred' : null
  };
}
