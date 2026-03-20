export interface TraversalEntry {
  fromNoteId: string;
  toNoteId: string;
  at: string;
}

export interface SessionState {
  traversalHistory: TraversalEntry[];
}

export interface SessionActions {
  recordTraversal: (fromNoteId: string, toNoteId: string) => void;
  clearTraversalHistory: () => void;
  getTraversalHistory: () => TraversalEntry[];
}
