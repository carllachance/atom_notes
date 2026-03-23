import { useSyncExternalStore } from 'react';
import { FocusMode, Lens } from '../types';
import { HistoryStackEntry, StateSnapshot } from '../types/reeentory';

const MAX_HISTORY_STACK = 20;
const MAX_RECENT_NOTES = 5;

let _historyStack: HistoryStackEntry[] = [];
let _bookmarks: StateSnapshot[] = [];
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Record a navigation event to the history stack
 * DG-2 AN-008: Resumable history stack
 */
export function recordHistoryEntry(
  noteId: string | null,
  noteTitle: string | null,
  lens: Lens,
  focusMode: FocusMode
): void {
  const entry: HistoryStackEntry = {
    id: generateId(),
    timestamp: Date.now(),
    noteId,
    noteTitle,
    lensKind: lens.kind,
    focusMode: { ...focusMode },
    isPinned: false,
  };

  // Don't add duplicate consecutive entries
  if (_historyStack.length > 0 && _historyStack[0].noteId === noteId) {
    return;
  }

  _historyStack = [entry, ..._historyStack].slice(0, MAX_HISTORY_STACK);
  notifyListeners();
}

/**
 * Pin an entry from history to make it persistent
 */
export function pinHistoryEntry(entryId: string, label?: string): StateSnapshot | null {
  const entry = _historyStack.find((e) => e.id === entryId);
  if (!entry) return null;

  const bookmark: StateSnapshot = {
    id: generateId(),
    label: label || `Pin ${new Date(entry.timestamp).toLocaleDateString()}`,
    createdAt: Date.now(),
    activeNoteId: entry.noteId,
    lens: { kind: entry.lensKind as Lens['kind'] } as Lens,
    focusMode: entry.focusMode,
    recentNoteIds: _historyStack.slice(0, MAX_RECENT_NOTES).map((e) => e.noteId).filter(Boolean) as string[],
    memorySummary: null,
    summarySource: null,
  };

  _bookmarks = [..._bookmarks, bookmark];
  notifyListeners();
  return bookmark;
}

/**
 * Create a bookmark of the current state
 * DG-2 AN-009: Drop a pin state bookmarking
 */
export function createBookmark(
  label: string,
  activeNoteId: string | null,
  lens: Lens,
  focusMode: FocusMode
): StateSnapshot {
  const bookmark: StateSnapshot = {
    id: generateId(),
    label,
    createdAt: Date.now(),
    activeNoteId,
    lens,
    focusMode,
    recentNoteIds: _historyStack.slice(0, MAX_RECENT_NOTES).map((e) => e.noteId).filter(Boolean) as string[],
    memorySummary: null,
    summarySource: null,
  };

  _bookmarks = [..._bookmarks, bookmark];
  notifyListeners();
  return bookmark;
}

/**
 * Remove a bookmark
 */
export function removeBookmark(bookmarkId: string): void {
  _bookmarks = _bookmarks.filter((b) => b.id !== bookmarkId);
  notifyListeners();
}

/**
 * Clear all history
 */
export function clearHistoryStack(): void {
  _historyStack = [];
  notifyListeners();
}

/**
 * Clear all bookmarks
 */
export function clearBookmarks(): void {
  _bookmarks = [];
  notifyListeners();
}

export function getHistoryStack(): HistoryStackEntry[] {
  return _historyStack;
}

export function getBookmarks(): StateSnapshot[] {
  return _bookmarks;
}

function subscribe(callback: () => void) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function getSnapshot() {
  return {
    history: _historyStack,
    bookmarks: _bookmarks,
  };
}

/**
 * React hook for history stack and bookmarks
 * Re-renders when either changes
 */
export function useReentryState(): { history: HistoryStackEntry[]; bookmarks: StateSnapshot[] } {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * React hook specifically for history stack
 */
export function useHistoryStack(): HistoryStackEntry[] {
  const { history } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return history;
}

/**
 * React hook specifically for bookmarks
 */
export function useBookmarks(): StateSnapshot[] {
  const { bookmarks } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return bookmarks;
}
