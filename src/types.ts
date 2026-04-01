import { OnboardingProfile, StudyInteraction, StudySupportBlock } from './learning/studyModel';

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

export type LibraryLens = {
  kind: 'library';
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

export type Lens = UniverseLens | ProjectLens | WorkspaceLens | LibraryLens | RevealLens | ArchiveLens;

export type NoteIntent = 'task' | 'link' | 'code' | 'note';
export type TaskState = 'open' | 'done';
export type NoteShelfSize = 'compact' | 'standard' | 'featured' | 'hero';


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

export type GroupSuggestion = {
  id: string;
  groupId: string;
  confidence: number;
  explanation: string;
  createdAt: number;
};

export type StandaloneReference = {
  id: string;
  label: string;
  kind: 'reference' | 'attachment';
  text: string;
  workspaceIds: string[];
  projectIds: string[];
  colorHint?: string;
  metadata?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
};

export type ResearchSourceKind = 'note' | 'attachment' | 'chat' | 'reference';
export type ResearchOutputKind = 'summary' | 'flash_cards' | 'speaker_notes' | 'outline';
export type ResearchMode = 'strict_knowledge_base' | 'ai_starting_point';

export type ResearchSource = {
  id: string;
  kind: ResearchSourceKind;
  label: string;
  sourceId: string;
};

export type ResearchSourceSet = {
  id: string;
  name: string;
  sourceIds: string[];
  mode: ResearchMode;
  suggestedOutputs: ResearchOutputKind[];
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
  workspaceIds?: string[];
  inferredWorkspaceIds?: string[];
  workspaceId: string | null;
  projectSuggestions?: GroupSuggestion[];
  workspaceSuggestions?: GroupSuggestion[];
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
  /** Provenance metadata for source tracking (EPIC-006) */
  provenance?: NoteProvenance;
  /** Whether note conclusions need source verification */
  verificationState?: 'verified' | 'needs-review';
  /** Human-readable reason for verification state */
  verificationReason?: string;
  shelfSize?: NoteShelfSize;
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
  onboardingProfile?: OnboardingProfile | null;
  studySupportBlocks?: Record<string, StudySupportBlock[]>;
  studyInteractions?: Record<string, StudyInteraction[]>;
  notes: NoteCardModel[];
  relationships: Relationship[];
  projects: Project[];
  workspaces: Workspace[];
  libraryItems?: StandaloneReference[];
  researchSourceSets?: ResearchSourceSet[];
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

/**
 * Source origin types for provenance tracking (EPIC-006)
 */
export type NoteSourceOrigin =
  | 'manual'           // User typed it manually
  | 'ai-generated'     // Created by AI
  | 'imported'         // Imported from external source
  | 'clipboard-paste'  // Pasted from clipboard
  | 'quick-capture'   // Created via quick capture
  | 'file-import';     // Imported from file attachment

/**
 * External reference types (EPIC-006)
 */
export type ExternalReferenceKind = 'url' | 'file' | 'citation' | 'cross-note';

export type SourceHealthStatus = 'grounded' | 'cached' | 'uncertain' | 'orphaned' | 'regrounded';
export type SourceBreakType = 'access_break' | 'identity_break' | 'meaning_break';

/**
 * External reference with provenance metadata (EPIC-006)
 */
export type ExternalReference = {
  id: string;
  kind: ExternalReferenceKind;
  /** Human-readable label for the reference */
  label: string;
  /** The actual reference value (URL, file path, citation key, note ID) */
  value: string;
  /** Optional metadata like page numbers, timestamps, etc. */
  metadata?: Record<string, string>;
  /** Confidence that this reference is valid/relevant */
  confidence: number;
  /** Whether this reference was inferred by AI or explicitly added */
  isInferred: boolean;
  /** Access condition at last evaluation */
  accessStatus?: 'reachable' | 'restricted' | 'missing' | 'unknown';
  /** Identity integrity at last evaluation */
  identityStatus?: 'verified' | 'mismatch' | 'unknown';
  /** Meaning alignment at last evaluation */
  meaningStatus?: 'aligned' | 'drifted' | 'unknown';
  /** Derived source health lifecycle status */
  sourceHealth?: SourceHealthStatus;
  /** Explicit break category if degraded */
  breakType?: SourceBreakType;
  /** Optional one-line explanation for degraded links */
  breakDetail?: string;
  /** Timestamp of last health check */
  lastCheckedAt?: number;
  /** Timestamp when source became orphaned */
  orphanedAt?: number;
  /** Previous reference id when a source is regrounded */
  regroundedFromReferenceId?: string;
  createdAt: number;
};

/**
 * Provenance metadata for a note (EPIC-006)
 */
export type NoteProvenance = {
  /** Where the note content originated */
  origin: NoteSourceOrigin;
  /** When the note was first created */
  createdAt: number;
  /** When provenance was last updated */
  updatedAt: number;
  /** External references linked to this note */
  externalReferences: ExternalReference[];
  /** Optional source note if this note was derived from another */
  derivedFromNoteId?: string;
  /** Optional AI session ID if created during AI interaction */
  aiSessionId?: string;
  /** Content hash for integrity verification */
  contentHash?: string;
};

/**
 * Backup metadata for privacy-respecting export (EPIC-013)
 */
export type BackupMetadata = {
  version: string;
  exportedAt: number;
  schemaVersion: number;
  includesAttachments: boolean;
  includesAiTranscript: boolean;
  includesExternalReferences: boolean;
  privacyMode: 'full' | 'redacted' | 'minimal';
};

/**
 * Export format types (EPIC-013)
 */
export type ExportFormat = 'json' | 'markdown' | 'csv';

/**
 * Privacy options for export (EPIC-013)
 */
export type PrivacyOptions = {
  includeAttachments: boolean;
  includeAiTranscript: boolean;
  includeExternalReferences: boolean;
  includeProvenance: boolean;
  redactTimestamps: boolean;
  redactAiSessionIds: boolean;
};

/**
 * Schema version for migrations (EPIC-010)
 */
export type SchemaVersion = {
  major: number;
  minor: number;
  patch: number;
  label?: string;
};

/**
 * Platform types for cross-platform support (EPIC-011)
 */
export type PlatformType = 'web' | 'mac' | 'windows' | 'linux' | 'ios' | 'android';

/**
 * Platform capabilities (EPIC-011)
 */
export type PlatformCapabilities = {
  /** Native file system access */
  fileSystem: boolean;
  /** Native notifications */
  notifications: boolean;
  /** Global keyboard shortcuts */
  globalShortcuts: boolean;
  /** System tray integration */
  systemTray: boolean;
  /** Background process support */
  backgroundProcess: boolean;
  /** Native menus */
  nativeMenus: boolean;
  /** Touch/pointer input type */
  pointerType: 'mouse' | 'touch' | 'pen' | 'mixed';
};

/**
 * Platform configuration (EPIC-011)
 */
export type PlatformConfig = {
  platform: PlatformType;
  capabilities: PlatformCapabilities;
  isNative: boolean;
  version: string;
  arch?: string;
};

/**
 * Extension trust levels (EPIC-012)
 */
export type ExtensionTrustLevel = 'system' | 'trusted' | 'untrusted' | 'sandboxed';

/**
 * Extension permissions (EPIC-012)
 */
export type ExtensionPermission =
  | 'read_notes'
  | 'write_notes'
  | 'read_relationships'
  | 'write_relationships'
  | 'access_ai'
  | 'import_files'
  | 'export_data'
  | 'network_access'
  | 'custom_lens';

/**
 * Extension manifest (EPIC-012)
 */
export type ExtensionManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  permissions: ExtensionPermission[];
  trustLevel: ExtensionTrustLevel;
  minAppVersion: string;
  lenses?: LensExtension[];
  entryPoint?: string;
  enabled: boolean;
  installedAt: number;
};

/**
 * Lens extension definition (EPIC-012)
 */
export type LensExtension = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  query: string;
  scope?: {
    projects?: string[];
    workspaces?: string[];
    tags?: string[];
  };
};

/**
 * Extension runtime context (EPIC-012)
 */
export type ExtensionContext = {
  manifest: ExtensionManifest;
  platform: PlatformConfig;
  capabilities: {
    canReadNotes: boolean;
    canWriteNotes: boolean;
    canAccessAI: boolean;
    canImportFiles: boolean;
    canExportData: boolean;
  };
};

/**
 * Extension error types (EPIC-012)
 */
export type ExtensionError = {
  code: string;
  message: string;
  extensionId: string;
  timestamp: number;
};

/**
 * Extension lifecycle events (EPIC-012)
 */
export type ExtensionEvent =
  | { type: 'enabled'; extensionId: string }
  | { type: 'disabled'; extensionId: string }
  | { type: 'error'; error: ExtensionError }
  | { type: 'lens_activated'; extensionId: string; lensId: string }
  | { type: 'permission_granted'; extensionId: string; permission: ExtensionPermission }
  | { type: 'permission_revoked'; extensionId: string; permission: ExtensionPermission };
