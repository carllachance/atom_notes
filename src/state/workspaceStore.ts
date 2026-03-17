import { WorkspaceState } from '../models/workspace';

export const defaultWorkspaceState: WorkspaceState = {
  mode: 'ACTIVE',
  focusedNoteId: null,
  expandedNoteIds: [],
  cardPositions: {},
  cardZOrder: [],
  anchorOrder: [],
  noteScrollPositions: {},
  captureBoxOpen: false,
  archiveViewOpen: false,
};
