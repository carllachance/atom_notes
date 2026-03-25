import { NoteCardModel } from '../types';
import { HistoryStackEntry, StateSnapshot } from '../types/reeentory';
import { collectSemanticSignals } from '../notes/semanticSignals';

export type MemorySummaryResult = {
  summary: string | null;
  source: 'ai-generated' | 'ai-inferred' | null;
};

function compactTitle(note: NoteCardModel | undefined, fallback: string | null): string {
  if (note?.title?.trim()) return note.title.trim();
  if (note?.body?.trim()) return note.body.trim().slice(0, 42);
  return fallback ?? 'untitled note';
}

function firstSignalText(note: NoteCardModel | undefined, type: 'decision' | 'open_question' | 'follow_up') {
  if (!note) return null;
  const signal = collectSemanticSignals(note.body).find((candidate) => candidate.type === type);
  return signal?.text ?? null;
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
  const activeNote = activeNoteId ? notesById.get(activeNoteId) : undefined;
  const bookmarkLabel = bookmarks[0]?.label;

  const lines: string[] = [];
  if (activeTitle) lines.push(`You are in ${activeTitle}.`);
  if (recentTitles.length) lines.push(`Recent path: ${recentTitles.join(' → ')}.`);
  const recentDecision = firstSignalText(activeNote, 'decision') ?? firstSignalText(notesById.get(recentHistory[0]?.noteId ?? ''), 'decision');
  const unresolvedQuestion = firstSignalText(activeNote, 'open_question') ?? firstSignalText(notesById.get(recentHistory[0]?.noteId ?? ''), 'open_question');
  const suggestedFollowUp = firstSignalText(activeNote, 'follow_up') ?? firstSignalText(notesById.get(recentHistory[0]?.noteId ?? ''), 'follow_up');
  if (recentDecision) lines.push(`Recent decision: ${recentDecision}.`);
  if (unresolvedQuestion) lines.push(`Unresolved question: ${unresolvedQuestion}.`);
  if (suggestedFollowUp) lines.push(`Suggested follow-up: ${suggestedFollowUp}.`);
  if (bookmarkLabel) lines.push(`Latest pin: ${bookmarkLabel}.`);

  return {
    summary: lines.join(' ').trim() || null,
    source: lines.length ? 'ai-inferred' : null
  };
}
