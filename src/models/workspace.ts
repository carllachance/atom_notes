export type WorkspaceMode = 'DISMISSED' | 'SUMMONING' | 'ACTIVE' | 'DISMISSING';

export type CardPosition = { x: number; y: number };

export type WorkspaceState = {
  mode: WorkspaceMode;
  focusedNoteId: string | null;
  expandedNoteIds: string[];
  cardPositions: Record<string, CardPosition>;
  cardZOrder: string[];
  anchorOrder: string[];
  noteScrollPositions: Record<string, number>;
  captureBoxOpen: boolean;
  archiveViewOpen: boolean;
};
