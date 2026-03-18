export type LensScopeMode = 'context' | 'strict';

export type UniverseLens = {
  kind: 'universe';
};

export type ProjectLens = {
  kind: 'project';
  projectId: string | null;
  mode: LensScopeMode;
};

export type WorkspaceLens = {
  kind: 'workspace';
  workspaceId: string | null;
  mode: LensScopeMode;
};

export type RevealLens = {
  kind: 'reveal';
  query: string;
  workspaceId: string | null;
  projectId: string | null;
  mode: LensScopeMode;
};

export type ArchiveLens = {
  kind: 'archive';
};

export type Lens = UniverseLens | ProjectLens | WorkspaceLens | RevealLens | ArchiveLens;

export type NoteIntent = 'task' | 'link' | 'code' | 'note';

export type RelationshipType =
  | 'related'
  | 'references'
  | 'depends_on'
  | 'supports'
  | 'contradicts'
  | 'part_of'
  | 'leads_to'
  | 'derived_from';

export type RelationshipState = 'proposed' | 'confirmed';
export type RelationshipExplicitness = 'explicit' | 'inferred';

export type SuggestedRelationship = {
  id: string;
  targetId: string | null;
  targetTitle: string;
  type: RelationshipType;
  confidence: number;
  directional: boolean;
  reason: string;
  createdAt: number;
};

export type Project = {
  id: string;
  key: string;
  name: string;
  color: string;
  description: string;
  createdAt: number;
  updatedAt: number;
};

export type Workspace = {
  id: string;
  key: string;
  name: string;
  color: string;
  description: string;
  createdAt: number;
  updatedAt: number;
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
  isFocus?: boolean;
  projectIds: string[];
  inferredProjectIds?: string[];
  workspaceId: string | null;
  intent?: NoteIntent;
  intentConfidence?: number;
  inferredRelationships?: SuggestedRelationship[];
};

export type Relationship = {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  state: RelationshipState;
  explicitness: RelationshipExplicitness;
  directional: boolean;
  confidence?: number;
  isInferred?: boolean;
  explanation: string;
  heuristicSupported: boolean;
  createdAt: number;
  lastActiveAt: number;
};

export type FocusMode = {
  highlight: boolean;
  isolate: boolean;
};

export type CaptureComposerState = {
  open: boolean;
  draft: string;
  lastCreatedNoteId: string | null;
};

export type AIInteractionMode = 'ask' | 'explore' | 'summarize' | 'act';
export type AIPanelState = 'hidden' | 'peek' | 'open';

export type ActionSuggestion = {
  id: string;
  label: string;
  kind: 'highlight_nodes' | 'focus_cluster' | 'open_note' | 'preview_relationships' | 'create_summary';
  noteIds?: string[];
  noteId?: string;
  relationships?: Array<{ fromId: string; toId: string; type: RelationshipType }>;
  summary?: string;
  requiresConfirmation?: boolean;
};

export type InsightsResult = {
  noteId: string;
  score: number;
  reasons: string[];
};

export type StructuredInsightSection = {
  id: string;
  title: string;
  body: string;
};

export type InsightsResponse = {
  answer: string;
  sections: StructuredInsightSection[];
  references: string[];
  results: InsightsResult[];
  actions?: ActionSuggestion[];
};

export type AITranscriptEntry = {
  id: string;
  role: 'user' | 'assistant';
  mode: AIInteractionMode;
  content: string;
  createdAt: number;
};

export type AIPanelViewState = {
  state: AIPanelState;
  mode: AIInteractionMode;
  query: string;
  response: InsightsResponse | null;
  transcript: AITranscriptEntry[];
  loading: boolean;
};

export type SceneState = {
  notes: NoteCardModel[];
  relationships: Relationship[];
  projects: Project[];
  workspaces: Workspace[];
  isDragging: boolean;
  activeNoteId: string | null;
  quickCaptureOpen: boolean;
  captureComposer: CaptureComposerState;
  focusMode: FocusMode;
  aiPanel: AIPanelViewState;
  lastCtrlTapTs: number;
  lens: Lens;
  canvasScrollLeft: number;
  canvasScrollTop: number;
};
