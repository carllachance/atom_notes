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


export type AttachmentFileKind = 'pdf' | 'text' | 'markdown' | 'json' | 'csv' | 'image';
export type AttachmentProcessingStatus = 'uploaded' | 'processing' | 'processed' | 'failed';
export type AttachmentExtractionMethod = 'native_text' | 'ocr';

export type AttachmentSourceLocation = {
  kind: 'page' | 'line_range' | 'source';
  label: string;
  pageNumber?: number;
  lineStart?: number;
  lineEnd?: number;
};

export type AttachmentChunk = {
  id: string;
  text: string;
  sourceLocation: AttachmentSourceLocation;
};

export type AttachmentExtractionResult = {
  method: AttachmentExtractionMethod;
  extractedAt: number;
  contentHash: string;
  text: string;
  chunks: AttachmentChunk[];
};

export type NoteAttachment = {
  id: string;
  name: string;
  mimeType: string;
  fileSize: number;
  addedAt: number;
  fileKind: AttachmentFileKind;
  rawFile: {
    dataUrl: string;
    contentHash: string;
    lastModified: number;
  };
  processing: {
    status: AttachmentProcessingStatus;
    error: string | null;
    retryCount: number;
    updatedAt: number;
  };
  extraction: AttachmentExtractionResult | null;
};

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
  deleted: boolean;
  deletedAt: number | null;
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
  attachments?: NoteAttachment[];
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
  draft: string;
  lastCreatedNoteId: string | null;
};

export type AIInteractionMode = 'ask' | 'explore' | 'summarize' | 'act';
export type ExpandedSecondarySurface = 'none' | 'thinking' | 'capture';

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
  /** Source of the content for AI transparency (DG-2 AN-013) */
  contentSource: 'user-authored' | 'ai-generated' | 'ai-inferred' | 'ai-sourced';
};

export type AIPanelViewState = {
  mode: AIInteractionMode;
  query: string;
  response: InsightsResponse | null;
  transcript: AITranscriptEntry[];
  loading: boolean;
  /** Current AI communication state for transparency (DG-2 AN-015) */
  communicationState: 'idle' | 'sending' | 'receiving' | 'streaming' | 'review-mode';
  /** Interaction mode: live-streaming vs review-before-send (DG-2 AN-016) */
  interactionMode: 'live-stream' | 'review-before-send';
};

export type SceneState = {
  notes: NoteCardModel[];
  relationships: Relationship[];
  projects: Project[];
  workspaces: Workspace[];
  insightTimeline?: InsightTimelineEntry[];
  isDragging: boolean;
  activeNoteId: string | null;
  expandedSecondarySurface: ExpandedSecondarySurface;
  captureComposer: CaptureComposerState;
  focusMode: FocusMode;
  aiPanel: AIPanelViewState;
  lastCtrlTapTs: number;
  lens: Lens;
  canvasScrollLeft: number;
  canvasScrollTop: number;
};
