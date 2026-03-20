import { useSyncExternalStore } from 'react';
import { TraversalEntry } from './types';

const MAX_TRAVERSAL_HISTORY = 20;

let _traversalHistory: TraversalEntry[] = [];
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

export function recordTraversal(fromNoteId: string, toNoteId: string): void {
  const entry: TraversalEntry = {
    fromNoteId,
    toNoteId,
    at: new Date().toISOString(),
  };
  _traversalHistory = [..._traversalHistory, entry].slice(-MAX_TRAVERSAL_HISTORY);
  notifyListeners();
}

export function clearTraversalHistory(): void {
  _traversalHistory = [];
  notifyListeners();
}

export function getTraversalHistory(): TraversalEntry[] {
  return _traversalHistory;
}

function subscribe(callback: () => void) {
  _listeners.add(callback);
  return () => _listeners.delete(callback);
}

function getSnapshot() {
  return _traversalHistory;
}

/** React hook that re-renders when traversal history changes */
export function useTraversalHistory(): TraversalEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
