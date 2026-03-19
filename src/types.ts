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
export type TaskState = 'open' | 'done';

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
  taskState?: TaskState;
  taskSource?: {
    sourceNoteId: string;
    promotionId: string;
    start: number;
    end: number;
    text: string;
    createdAt: number;
  } | null;
  promotedTaskFragments?: Array<{
    id: string;
    taskNoteId: string;
    start: number;
    end: number;
    text: string;
    createdAt: number;
  }>;
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
  kind: 'highlight_nodes' | 'focus_cluster' | 'open_note' | 'preview_relationships' | 'create_summary' | 'append_to_note' | 'create_link' | 'pin_to_note';
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
  highlightNoteIds?: string[];
};

export type InsightTimelineAction =
  | {
      id: string;
      label: string;
      kind: 'open';
      noteId: string;
    }
  | {
      id: string;
      label: string;
      kind: 'preview';
      suggestion: ActionSuggestion;
    };

export type InsightTimelineEntry = {
  id: string;
  noteId: string;
  kind: 'structural' | 'action' | 'ai';
  title: string;
  detail: string;
  createdAt: number;
  actions: InsightTimelineAction[];
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
  insightTimeline?: InsightTimelineEntry[];
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
