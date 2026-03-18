export type Lens = 'all' | 'focus' | 'archive';

export type RelationshipType = 'related_concept' | 'references';
export type RelationshipState = 'proposed' | 'confirmed';
export type RelationshipExplicitness = 'explicit' | 'inferred';

export type ProjectModel = {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type ProjectRevealState = {
  activeProjectId: string | null;
};

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
  projectIds: string[];
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
  projects: ProjectModel[];
  projectReveal: ProjectRevealState;
  activeNoteId: string | null;
  quickCaptureOpen: boolean;
  lastCtrlTapTs: number;
  lens: Lens;
  canvasScrollLeft: number;
  canvasScrollTop: number;
};
