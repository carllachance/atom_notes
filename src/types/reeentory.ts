// Re-entry and history types for DG-2 Phase 1
import { FocusMode, Lens } from '../types';

export type HistoryStackEntry = {
  id: string;
  timestamp: number;
  noteId: string | null;
  noteTitle: string | null;
  lensKind: string;
  focusMode: FocusMode;
  isPinned: boolean;
  label?: string;
};

export type StateSnapshot = {
  id: string;
  label: string;
  createdAt: number;
  activeNoteId: string | null;
  lens: Lens;
  focusMode: FocusMode;
  recentNoteIds: string[];
  memorySummary: string | null;
  summarySource: 'ai-generated' | 'ai-inferred' | null;
};

export type ReentrySurfaceState = {
  isExpanded: boolean;
  history: HistoryStackEntry[];
  bookmarks: StateSnapshot[];
};

export type ContentSource = 'user-authored' | 'ai-generated' | 'ai-inferred' | 'ai-sourced';

export type AICommunicationState = 'idle' | 'sending' | 'receiving' | 'streaming' | 'review-mode';
