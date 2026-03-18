export type WorkspaceId = string;
export type ProjectId = string;

export type WorkspaceLens = {
  kind: 'workspace';
  workspaceId: WorkspaceId | null;
};

export type ProjectLens = {
  kind: 'project';
  projectId: ProjectId;
  workspaceId: WorkspaceId | null;
};

export type RevealQueryLens = {
  kind: 'reveal';
  mode: 'query';
  query: string;
  workspaceId: WorkspaceId | null;
};

export type RevealRelationshipLens = {
  kind: 'reveal';
  mode: 'relationship';
  noteId: string;
  workspaceId: WorkspaceId | null;
};

export type ArchiveLens = {
  kind: 'archive';
};

export type Lens = WorkspaceLens | ProjectLens | RevealQueryLens | RevealRelationshipLens | ArchiveLens;

export type RelationshipType = 'related_concept' | 'references';
export type RelationshipState = 'proposed' | 'confirmed';
export type RelationshipExplicitness = 'explicit' | 'inferred';

export type NoteCardModel = {
  id: string;
  title: string | null;
  body: string;
  anchors: string[];
  trace: string;
  x: number;
  y: number;
  z: number;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  inFocus?: boolean;
  workspaceId: WorkspaceId | null;
  workspaceAffinities: WorkspaceId[];
  projectIds: ProjectId[];
};

export type Relationship = {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  state: RelationshipState;
  explicitness: RelationshipExplicitness;
  confidence: number;
  explanation: string;
  heuristicSupported: boolean;
  createdAt: number;
  lastActiveAt: number;
};

export type SceneState = {
  notes: NoteCardModel[];
  relationships: Relationship[];
  activeNoteId: string | null;
  quickCaptureOpen: boolean;
  lastCtrlTapTs: number;
  lens: Lens;
  canvasScrollLeft: number;
  canvasScrollTop: number;
};
