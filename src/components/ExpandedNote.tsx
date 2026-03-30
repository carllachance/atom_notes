import {
  DETAIL_SURFACE_RELATIONSHIP_OPTIONS,
  DetailSurfaceRelationshipOption,
  getDetailSurfaceRelationshipOption
} from '../detailSurface/detailSurfaceModel';
import { ChangeEvent, PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { MarkdownProjectionView } from './MarkdownProjectionView';
import { ThinkingGlyph } from './ThinkingGlyph';
import { InlineNoteLinkEditor } from './InlineNoteLinkEditor';
import { RefinementComposer } from './RefinementComposer';
import {
  buildInsertedRefinementBlock,
  generateRefinementSuggestion,
  RefinementPresetId,
  RefinementSuggestion
} from '../ai/refinement';
import { toggleChecklistItem } from '../checklists/checklistService';
import { getCompactDisplayTitle } from '../noteText';
import { isRelationshipTypeDirectional } from '../relationshipLogic';
import { getProactiveLinkSuggestions, ProactiveLinkSuggestion } from '../relationships/inlineLinking';
import { getResolvedTaskFragments, getTaskStateLabel } from '../tasks/taskPromotions';
import { applyFollowUpLifecycleAction, getLikelyActionFragments } from '../tasks/actionFragmentSuggestions';
import { ProjectDraft } from '../projects/projectModel';
import { WorkspaceDraft } from '../workspaces/workspaceModel';
import { relinkExternalReference, summarizeNoteSourceHealth } from '../notes/provenance';
import { NoteCardModel, Project, Relationship, RelationshipType, Workspace } from '../types';
import { AttachmentPanel } from './attachments/AttachmentPanel';
import { FocusLensRelatedNote } from '../scene/focusLens';
import { RelationshipGraph } from './RelationshipGraph';
import { StudySupportPanel } from './StudySupportPanel';
import { StudySupportBlock } from '../learning/studyModel';

type VisibleRelationship = {
  id: string;
  targetId: string;
  targetTitle: string;
  type: RelationshipType;
  explicitness: 'explicit' | 'inferred';
  state: 'proposed' | 'confirmed';
  explanation: string;
  heuristicSupported: boolean;
  fromId: string;
  toId: string;
  directional: boolean;
  confidence?: number;
};

type ExpandedNoteProps = {
  note: NoteCardModel | null;
  notes: NoteCardModel[];
  projects: Project[];
  workspaces: Workspace[];
  noteProjects: Project[];
  noteWorkspace: Workspace | null;
  relationships: VisibleRelationship[];
  inspectedRelationship: Relationship | null;
  canUndoRelationshipEdit: boolean;
  activeProjectRevealId: string | null;
  activeWorkspaceLensId: string | null;
  thinkingActive: boolean;
  hasFreshInsights: boolean;
  initialPosition?: { x: number; y: number };
  rightInset?: number;
  bottomInset?: number;
  onClose: () => void;
  onThinkAboutNote: () => void;
  onArchive: (id: string) => void;
  onRestoreArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onChange: (id: string, updates: Partial<NoteCardModel>) => void;
  onOpenRelated: (targetNoteId: string, relationshipId: string) => void;
  onInspectRelationship: (relationshipId: string) => void;
  onCloseRelationshipInspector: () => void;
  onCreateExplicitLink: (fromId: string, toId: string, type: RelationshipType) => void;
  onCreateInlineLinkedNote: (sourceNoteId: string, title: string, type: RelationshipType) => string | null;
  onConfirmRelationship: (relationshipId: string) => void;
  onPromoteFragmentToTask: (sourceNoteId: string, selection: { start: number; end: number; text: string }) => { taskNoteId: string | null; promotionId: string | null };
  onSetTaskState: (noteId: string, taskState: 'open' | 'done') => void;
  onUpdateRelationship: (relationshipId: string, type: RelationshipType, fromId: string, toId: string) => void;
  onRemoveRelationship: (relationshipId: string) => void;
  onUndoRelationshipEdit: () => void;
  onToggleFocus: (id: string) => void;
  onSetProjectIds: (id: string, projectIds: string[]) => void;
  onCreateProject: (id: string, draft: ProjectDraft) => void;
  onSetWorkspaceId: (id: string, workspaceId: string | null) => void;
  onCreateWorkspace: (id: string, draft: WorkspaceDraft) => void;
  onSetProjectLens: (projectId: string | null) => void;
  onSetWorkspaceLens: (workspaceId: string | null) => void;
  onAddAttachments: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveAttachment: (attachmentId: string) => void;
  onRetryAttachment: (attachmentId: string) => void;
  onHoverRelatedNote: (noteId: string) => void;
  onClearRelatedHover: (noteId: string) => void;
  focusLensRelatedNotes: FocusLensRelatedNote[];
  focusLensOverflowCount: number;
  hoveredRelatedNoteId: string | null;
  focusLensCanGoBack: boolean;
  focusLensPinned: boolean;
  onFocusLensBack: () => void;
  onFocusLensPin: () => void;
  onFocusLensReset: () => void;
  onPositionChange?: (noteId: string, position: { x: number; y: number }) => void;
  studyActionsEnabled?: boolean;
  studySupportBlocks?: StudySupportBlock[];
  onRunStudyAction?: (action: 'explain' | 'key_ideas' | 'quiz' | 'flashcards' | 'review_recommendation' | 'answer_check', userAnswer?: string) => void;
  onRemoveStudyBlock?: (noteId: string, blockId: string) => void;
};

type DragState = { dx: number; dy: number };
type PanelMode = 'read' | 'edit' | 'constellation' | 'source';
type UtilityPanel = 'none' | 'sources' | 'related' | 'actions' | 'transform' | 'workspace' | 'project';
type TextSelection = { start: number; end: number; text: string };
type SuggestedLinkRow = ProactiveLinkSuggestion & {
  selectedType: RelationshipType;
  workspaceLabel: string | null;
  workspaceColor: string | null;
};

type IconButtonKind = 'project' | 'workspace' | 'thinking';

type IconToolButtonProps = {
  label: string;
  kind: IconButtonKind;
  onClick: () => void;
  pressed?: boolean;
  pulse?: boolean;
};

const DEFAULT_PROJECT_DRAFT: ProjectDraft = { key: '', name: '', color: '#7aa2f7', description: '' };
const DEFAULT_WORKSPACE_DRAFT: WorkspaceDraft = { key: '', name: '', color: '#5fbf97', description: '' };
const TRACE_LIMIT = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getClampedPanelPosition(position: { x: number; y: number }, panel: HTMLElement | null, rightInset: number, bottomInset: number) {
  const panelWidth = panel?.offsetWidth ?? 760;
  const panelHeight = panel?.offsetHeight ?? 760;
  const availableWidth = Math.max(360, window.innerWidth - rightInset);
  const availableHeight = Math.max(420, window.innerHeight - bottomInset);
  const maxX = availableWidth / 2 - panelWidth / 2 - 18;
  const minX = -maxX;
  const maxY = availableHeight / 2 - panelHeight / 2 - 18;
  const minY = -maxY;
  return {
    x: clamp(position.x, minX, maxX),
    y: clamp(position.y, minY, maxY)
  };
}

function ToolIcon({ kind }: { kind: IconButtonKind }) {
  if (kind === 'workspace') {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2.3" y="3.1" width="11.4" height="9.8" rx="2.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.2 5.8h5.6M5.2 8h5.6M5.2 10.2h3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
      </svg>
    );
  }

  if (kind === 'thinking') {
    return <ThinkingGlyph />;
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.1 4.8h6.8l2 2v4.4a1.7 1.7 0 0 1-1.7 1.7H4.8a1.7 1.7 0 0 1-1.7-1.7z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.2" />
      <path d="M8 6.1v4M6 8.1h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
    </svg>
  );
}

function IconToolButton({ label, kind, onClick, pressed = false, pulse = false }: IconToolButtonProps) {
  return (
    <button
      type="button"
      className={`ghost-button icon-tool-button icon-tool-button--${kind} ${pressed ? 'active' : ''} ${pulse ? 'pulse' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <ToolIcon kind={kind} />
    </button>
  );
}

function formatRelationshipType(type: RelationshipType) {
  return getDetailSurfaceRelationshipOption(type).label ?? type.replace(/_/g, ' ');
}

function getFlowGroup(noteId: string, relationship: VisibleRelationship) {
  if (!relationship.directional) return 'nearby' as const;
  if (relationship.toId === noteId) return 'upstream' as const;
  if (relationship.fromId === noteId) return 'downstream' as const;
  return 'nearby' as const;
}

function getFlowLabel(noteId: string, relationship: VisibleRelationship) {
  const group = getFlowGroup(noteId, relationship);
  if (group === 'upstream') return 'Upstream';
  if (group === 'downstream') return 'Downstream';
  return 'Nearby';
}


function getPlainEnglishRelationshipCue(relationship: { type: RelationshipType; explicitness: 'explicit' | 'inferred' }) {
  if (relationship.type === 'depends_on') return 'This note depends on';
  if (relationship.type === 'references') return 'Referenced by';
  if (relationship.type === 'derived_from') return 'Derived from';
  if (relationship.type === 'contradicts') return 'Potential conflict with';
  if (relationship.type === 'part_of') return 'Part of';
  if (relationship.type === 'supports') return 'Supports';
  if (relationship.type === 'leads_to') return 'Leads to';
  return relationship.explicitness === 'inferred' ? 'Possibly related to' : 'Related to';
}

function getRelationshipTone(noteId: string, relationship: VisibleRelationship) {
  if (relationship.type === 'depends_on') return 'dependency';
  if (getFlowGroup(noteId, relationship) === 'downstream' || ['supports', 'leads_to'].includes(relationship.type)) return 'forward';
  return 'neutral';
}

function getConstellationIntro(groups: Array<{ key: 'upstream' | 'downstream' | 'nearby'; items: VisibleRelationship[] }>) {
  const upstream = groups.find((group) => group.key === 'upstream')?.items.length ?? 0;
  const downstream = groups.find((group) => group.key === 'downstream')?.items.length ?? 0;
  const nearby = groups.find((group) => group.key === 'nearby')?.items.length ?? 0;

  if (!upstream && !downstream && !nearby) {
    return 'The local field is quiet for now. As this note starts touching others, they will gather here.';
  }

  const phrases: string[] = [];
  if (upstream) phrases.push(`${upstream} ${upstream === 1 ? 'note feeds into this one' : 'notes feed into this one'}`);
  if (downstream) phrases.push(`${downstream} ${downstream === 1 ? 'note grows out from here' : 'notes grow out from here'}`);
  if (nearby) phrases.push(`${nearby} ${nearby === 1 ? 'nearby note sits alongside it' : 'nearby notes sit alongside it'}`);

  return `A quick read of the local map: ${phrases.join(', ')}.`;
}

function describeDirection(fromLabel: string, toLabel: string, directional: boolean) {
  return directional ? `${fromLabel} → ${toLabel}` : `${fromLabel} ↔ ${toLabel}`;
}

function getWorkspaceMeta(workspaces: Workspace[], workspaceId: string | null) {
  const workspace = workspaceId ? workspaces.find((candidate) => candidate.id === workspaceId) ?? null : null;
  return {
    label: workspace?.name ?? workspace?.key ?? null,
    color: workspace?.color ?? null
  };
}

function sceneRelationshipForTask(taskNoteId: string, sourceNoteId: string, relationships: VisibleRelationship[]) {
  return relationships.find((relationship) => (
    (relationship.fromId === taskNoteId && relationship.toId === sourceNoteId) ||
    (relationship.fromId === sourceNoteId && relationship.toId === taskNoteId) ||
    relationship.targetId === taskNoteId
  )) ?? null;
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={onClick}>
      {children}
    </button>
  );
}

function LowerDisclosure({
  title,
  summary,
  open,
  onToggle,
  children
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="detail-section detail-section--calm-disclosure" aria-label={title}>
      <button type="button" className="disclosure-summary" aria-expanded={open} onClick={onToggle}>
        <span>
          <strong>{title}</strong>
          <small>{summary}</small>
        </span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="detail-section__body">{children}</div> : null}
    </section>
  );
}

export function ExpandedNote({
  note,
  notes,
  projects,
  workspaces,
  noteProjects,
  noteWorkspace,
  relationships,
  inspectedRelationship,
  canUndoRelationshipEdit,
  activeProjectRevealId,
  activeWorkspaceLensId,
  thinkingActive,
  hasFreshInsights,
  initialPosition,
  rightInset = 24,
  bottomInset = 88,
  onClose,
  onThinkAboutNote,
  onArchive,
  onRestoreArchive,
  onDelete,
  onChange,
  onOpenRelated,
  onInspectRelationship,
  onCloseRelationshipInspector,
  onCreateExplicitLink,
  onCreateInlineLinkedNote,
  onConfirmRelationship,
  onPromoteFragmentToTask,
  onSetTaskState,
  onUpdateRelationship,
  onRemoveRelationship,
  onUndoRelationshipEdit,
  onToggleFocus,
  onSetProjectIds,
  onCreateProject,
  onSetWorkspaceId,
  onCreateWorkspace,
  onSetProjectLens,
  onSetWorkspaceLens,
  onAddAttachments,
  onRemoveAttachment,
  onRetryAttachment,
  onHoverRelatedNote,
  onClearRelatedHover,
  focusLensRelatedNotes,
  focusLensOverflowCount,
  hoveredRelatedNoteId,
  focusLensCanGoBack,
  focusLensPinned,
  onFocusLensBack,
  onFocusLensPin,
  onFocusLensReset,
  onPositionChange,
  studyActionsEnabled,
  studySupportBlocks,
  onRunStudyAction,
  onRemoveStudyBlock
}: ExpandedNoteProps) {
  const [panelMode, setPanelMode] = useState<PanelMode>('read');
  const [expandedUtilityPanel, setExpandedUtilityPanel] = useState<UtilityPanel>('none');
  const [composerSurface, setComposerSurface] = useState<'workspace' | 'project' | null>(null);
  const [showDangerActions, setShowDangerActions] = useState(false);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(DEFAULT_PROJECT_DRAFT);
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDraft>(DEFAULT_WORKSPACE_DRAFT);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [inspectorType, setInspectorType] = useState<RelationshipType>('related');
  const [previewDirectionReversed, setPreviewDirectionReversed] = useState(false);
  const [inlineHighlightedTargetId, setInlineHighlightedTargetId] = useState<string | null>(null);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const [suggestionTypeOverrides, setSuggestionTypeOverrides] = useState<Record<string, RelationshipType>>({});
  const [selectedTextRange, setSelectedTextRange] = useState<TextSelection | null>(null);
  const [sourceJumpRequest, setSourceJumpRequest] = useState<{ start: number; end: number; nonce: number } | null>(null);
  const [customRefinementInstruction, setCustomRefinementInstruction] = useState('');
  const [refinementPreview, setRefinementPreview] = useState<RefinementSuggestion | null>(null);
  const [refinementPreviewDraft, setRefinementPreviewDraft] = useState('');
  const [constellationFilter, setConstellationFilter] = useState<'all' | RelationshipType>('all');
  const [editAssistOpen, setEditAssistOpen] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const inlineHighlightTimerRef = useRef<number | null>(null);

  const groupedRelationshipOptions = useMemo(() => {
    return DETAIL_SURFACE_RELATIONSHIP_OPTIONS.reduce<Record<DetailSurfaceRelationshipOption['group'], DetailSurfaceRelationshipOption[]>>((groups, option) => {
      groups[option.group] ??= [];
      groups[option.group].push(option);
      return groups;
    }, { 'Core context': [], 'Operational flow': [], 'Structure': [] });
  }, []);

  useEffect(() => {
    setPosition(initialPosition ?? { x: 0, y: 0 });
    setDragState(null);
    setPanelMode(note?.trace === 'captured' ? 'edit' : 'read');
    setExpandedUtilityPanel('none');
    setComposerSurface(null);
    setShowDangerActions(false);
    setProjectDraft(DEFAULT_PROJECT_DRAFT);
    setWorkspaceDraft(DEFAULT_WORKSPACE_DRAFT);
    setInlineHighlightedTargetId(null);
    setDismissedSuggestionIds([]);
    setSuggestionTypeOverrides({});
    setSelectedTextRange(null);
    setCustomRefinementInstruction('');
    setRefinementPreview(null);
    setRefinementPreviewDraft('');
    setConstellationFilter('all');
    setEditAssistOpen(false);
  }, [initialPosition, note?.id, note?.trace]);

  useEffect(() => {
    return () => {
      if (inlineHighlightTimerRef.current) window.clearTimeout(inlineHighlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!inspectedRelationship) return;
    setInspectorType(inspectedRelationship.type);
    setPreviewDirectionReversed(false);
  }, [inspectedRelationship]);

  useEffect(() => {
    if (!note) return;
    const nextPosition = getClampedPanelPosition(position, panelRef.current, rightInset, bottomInset);
    if (nextPosition.x === position.x && nextPosition.y === position.y) return;
    setPosition(nextPosition);
    onPositionChange?.(note.id, nextPosition);
  }, [bottomInset, note, onPositionChange, position, rightInset]);

  useEffect(() => {
    if (!dragState || !panelRef.current) return;
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const nextPosition = getClampedPanelPosition(
        { x: event.clientX - dragState.dx, y: event.clientY - dragState.dy },
        panelRef.current,
        rightInset,
        bottomInset
      );
      setPosition(nextPosition);
    };
    const onPointerUp = () => {
      setDragState(null);
      if (note) onPositionChange?.(note.id, position);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [bottomInset, dragState, note, onPositionChange, position, rightInset]);

  const notesById = useMemo(() => new Map(notes.map((candidate) => [candidate.id, candidate])), [notes]);
  const taskStatesById = useMemo(() => new Map(notes.map((candidate) => [candidate.id, candidate.taskState])), [notes]);
  const resolvedPromotedFragments = useMemo(() => (note ? getResolvedTaskFragments(note) : []), [note]);
  const likelyActionFragments = useMemo(() => (note ? getLikelyActionFragments(note) : []), [note]);
  const relationshipsByTargetId = useMemo(
    () => new Map(relationships.map((relationship) => [relationship.targetId, { relationshipId: relationship.id, type: relationship.type }])),
    [relationships]
  );
  const proactiveSuggestions = useMemo(() => {
    if (!note) return [];
    return getProactiveLinkSuggestions({
      source: note,
      notes,
      existingTargetIds: new Set(relationships.map((relationship) => relationship.targetId))
    });
  }, [note, notes, relationships]);
  const visibleProactiveSuggestions: SuggestedLinkRow[] = useMemo(() => proactiveSuggestions
    .filter((suggestion) => !dismissedSuggestionIds.includes(suggestion.id))
    .map((suggestion) => {
      const workspaceMeta = getWorkspaceMeta(workspaces, notesById.get(suggestion.targetId)?.workspaceId ?? null);
      return {
        ...suggestion,
        selectedType: suggestionTypeOverrides[suggestion.id] ?? suggestion.type ?? 'related',
        workspaceLabel: workspaceMeta.label,
        workspaceColor: workspaceMeta.color
      };
    })
    .slice(0, 4), [dismissedSuggestionIds, notesById, proactiveSuggestions, suggestionTypeOverrides, workspaces]);

  const sourceNote = note?.taskSource ? notesById.get(note.taskSource.sourceNoteId) ?? null : null;
  const sourceSnippet = useMemo(() => {
    if (!note?.taskSource || !sourceNote) return null;
    const direct = sourceNote.body.slice(note.taskSource.start, note.taskSource.end);
    if (direct === note.taskSource.text) return direct;
    const exactIndex = sourceNote.body.indexOf(note.taskSource.text);
    if (exactIndex !== -1) return sourceNote.body.slice(exactIndex, exactIndex + note.taskSource.text.length);
    return note.taskSource.text;
  }, [note, sourceNote]);

  if (!note) return null;
  const noteProjectIds = new Set(note.projectIds);
  const isFocus = Boolean(note.isFocus ?? note.inFocus);
  const inspectedFrom = inspectedRelationship ? notesById.get(inspectedRelationship.fromId) ?? null : null;
  const inspectedTo = inspectedRelationship ? notesById.get(inspectedRelationship.toId) ?? null : null;
  const previewDirectional = isRelationshipTypeDirectional(inspectorType);
  const previewFromId = inspectedRelationship
    ? previewDirectional && previewDirectionReversed
      ? inspectedRelationship.toId
      : inspectedRelationship.fromId
    : '';
  const previewToId = inspectedRelationship
    ? previewDirectional && previewDirectionReversed
      ? inspectedRelationship.fromId
      : inspectedRelationship.toId
    : '';
  const previewFromLabel = notesById.get(previewFromId) ? getCompactDisplayTitle(notesById.get(previewFromId) as NoteCardModel, 24) : 'Unknown note';
  const previewToLabel = notesById.get(previewToId) ? getCompactDisplayTitle(notesById.get(previewToId) as NoteCardModel, 24) : 'Unknown note';
  const directionalityChanged = inspectedRelationship ? inspectedRelationship.directional !== previewDirectional : false;
  const explicitnessWillChange = inspectedRelationship?.explicitness === 'inferred';
  const connectedGroups = [
    { key: 'upstream' as const, label: 'Upstream', items: relationships.filter((relationship) => getFlowGroup(note.id, relationship) === 'upstream') },
    { key: 'downstream' as const, label: 'Downstream', items: relationships.filter((relationship) => getFlowGroup(note.id, relationship) === 'downstream') },
    { key: 'nearby' as const, label: 'Nearby', items: relationships.filter((relationship) => getFlowGroup(note.id, relationship) === 'nearby') }
  ].map((group) => ({
    ...group,
    items: group.items.sort((a, b) => {
      const typePriority = ['depends_on', 'references', 'derived_from', 'supports', 'leads_to', 'related', 'contradicts', 'part_of'];
      const aIndex = typePriority.indexOf(a.type);
      const bIndex = typePriority.indexOf(b.type);
      if (aIndex !== bIndex) return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      return a.targetTitle.localeCompare(b.targetTitle);
    })
  }));
  const constellationIntro = getConstellationIntro(connectedGroups);
  const upstreamCount = connectedGroups.find((group) => group.key === 'upstream')?.items.length ?? 0;
  const downstreamCount = connectedGroups.find((group) => group.key === 'downstream')?.items.length ?? 0;
  const nearbyCount = connectedGroups.find((group) => group.key === 'nearby')?.items.length ?? 0;
  const faintContextCount = focusLensRelatedNotes.filter((item) => item.degree === 2).length;
  const firstRingNotes = focusLensRelatedNotes.filter((item) => item.degree === 1);
  const visibleTraceNotes = firstRingNotes.slice(0, TRACE_LIMIT);
  const traceOverflow = Math.max(0, firstRingNotes.length - visibleTraceNotes.length + focusLensOverflowCount);
  const workspaceSummary = noteWorkspace ? noteWorkspace.name : 'Assign workspace';
  const threadSummary = noteProjects.length
    ? noteProjects.slice(0, 2).map((project) => project.name).join(', ') + (noteProjects.length > 2 ? ` +${noteProjects.length - 2}` : '')
    : 'No shared threads';
  const attachmentCount = note.attachments?.length ?? 0;
  const attachmentReadyCount = (note.attachments ?? []).filter((attachment) => attachment.processing.status === 'processed').length;
  const sourceHealth = summarizeNoteSourceHealth(note);
  const orphanedReferences = (note.provenance?.externalReferences ?? []).filter((reference) => reference.sourceHealth === 'orphaned');
  const sourceHealthSummaryLabel = sourceHealth.sourceHealthStatus.replace('_', ' ');
  const workspaceSectionOpen = expandedUtilityPanel === 'workspace';
  const projectSectionOpen = expandedUtilityPanel === 'project';
  const sourceSectionOpen = expandedUtilityPanel === 'sources';
  const transformSectionOpen = expandedUtilityPanel === 'transform';
  const showWorkspaceComposer = composerSurface === 'workspace';
  const showProjectComposer = composerSurface === 'project';
  const activeRelationshipRows = constellationFilter === 'all'
    ? connectedGroups
    : connectedGroups.map((group) => ({ ...group, items: group.items.filter((relationship) => relationship.type === constellationFilter) }));
  const helperSuggestionCount = visibleProactiveSuggestions.length + likelyActionFragments.length;
  const helperUI = {
    visible: panelMode === 'edit' && editAssistOpen,
    showProactiveSuggestions: panelMode === 'edit' && editAssistOpen,
    showFollowUps: panelMode === 'edit' && editAssistOpen && likelyActionFragments.length > 0
  };

  const constellationRelationships = useMemo<Relationship[]>(() => {
    const direct = relationships.map((relationship) => ({
      id: relationship.id,
      fromId: relationship.fromId,
      toId: relationship.toId,
      type: relationship.type,
      state: relationship.state,
      explicitness: relationship.explicitness,
      directional: relationship.directional,
      confidence: relationship.confidence ?? 0.6,
      explanation: relationship.explanation,
      heuristicSupported: relationship.heuristicSupported,
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    }));
    const context = focusLensRelatedNotes
      .filter((item) => item.degree === 2)
      .map((item) => ({
        id: `context-${item.relationshipId}-${item.targetId}`,
        fromId: note.id,
        toId: item.targetId,
        type: item.relationship.type,
        state: 'proposed' as const,
        explicitness: 'inferred' as const,
        directional: true,
        confidence: Math.min(0.45, item.relationship.confidence ?? 0.35),
        explanation: item.relationship.explanation || 'Context from the second ring.',
        heuristicSupported: item.relationship.heuristicSupported,
        createdAt: Date.now(),
        lastActiveAt: Date.now()
      }));
    return [...direct, ...context];
  }, [focusLensRelatedNotes, note.id, relationships]);

  const graphNotes = useMemo(() => {
    const noteIds = new Set<string>([note.id, ...constellationRelationships.map((relationship) => relationship.fromId), ...constellationRelationships.map((relationship) => relationship.toId)]);
    return notes.filter((candidate) => noteIds.has(candidate.id));
  }, [constellationRelationships, note.id, notes]);

  const ringByRelationshipId = useMemo<Record<string, 'primary' | 'secondary'>>(() => Object.fromEntries(constellationRelationships.map((relationship) => {
    const isContext = relationship.id.startsWith('context-');
    return [relationship.id, isContext ? 'secondary' : 'primary'];
  })), [constellationRelationships]);

  const flashInlineTarget = (targetId: string) => {
    setInlineHighlightedTargetId(targetId);
    onHoverRelatedNote(targetId);
    if (inlineHighlightTimerRef.current) window.clearTimeout(inlineHighlightTimerRef.current);
    inlineHighlightTimerRef.current = window.setTimeout(() => {
      onClearRelatedHover(targetId);
      setInlineHighlightedTargetId((current) => (current === targetId ? null : current));
      inlineHighlightTimerRef.current = null;
    }, 1400);
  };

  const runRefinement = (presetId: RefinementPresetId) => {
    const activeSelection = selectedTextRange && selectedTextRange.text.trim() ? selectedTextRange : null;
    const scope = activeSelection ? 'selection' as const : 'note' as const;
    const sourceText = activeSelection ? activeSelection.text : note.body;
    if (!sourceText.trim()) return;
    const preview = generateRefinementSuggestion({
      presetId,
      scope,
      sourceText,
      noteTitle: note.title,
      customInstruction: presetId === 'custom' ? customRefinementInstruction : undefined
    });
    setRefinementPreview(preview);
    setRefinementPreviewDraft(preview.suggestedText);
  };

  const clearRefinementPreview = () => {
    setRefinementPreview(null);
    setRefinementPreviewDraft('');
  };

  const applyRefinementReplace = () => {
    if (!refinementPreview) return;
    const nextText = refinementPreviewDraft.trim();
    if (!nextText) return;

    if (refinementPreview.scope === 'selection' && selectedTextRange) {
      const nextBody = `${note.body.slice(0, selectedTextRange.start)}${nextText}${note.body.slice(selectedTextRange.end)}`;
      onChange(note.id, { body: nextBody });
      setSelectedTextRange(null);
    } else {
      onChange(note.id, { body: nextText });
    }

    clearRefinementPreview();
  };

  const applyRefinementInsertBelow = () => {
    if (!refinementPreview) return;
    const nextText = refinementPreviewDraft.trim();
    if (!nextText) return;
    const insertedBlock = buildInsertedRefinementBlock(refinementPreview.label, nextText);

    if (refinementPreview.scope === 'selection' && selectedTextRange) {
      const insertionPoint = selectedTextRange.end;
      const nextBody = `${note.body.slice(0, insertionPoint)}\n\n${insertedBlock}${note.body.slice(insertionPoint)}`;
      onChange(note.id, { body: nextBody });
      setSelectedTextRange(null);
    } else {
      const nextBody = [note.body.trim(), insertedBlock].filter(Boolean).join('\n\n');
      onChange(note.id, { body: nextBody });
    }

    clearRefinementPreview();
  };

  const acceptSuggestedLink = (suggestion: SuggestedLinkRow) => {
    onCreateExplicitLink(note.id, suggestion.targetId, suggestion.selectedType);
    flashInlineTarget(suggestion.targetId);
    setDismissedSuggestionIds((current) => [...new Set([...current, suggestion.id])]);
  };

  const runOutcomeRefinement = (presetId: RefinementPresetId) => {
    setPanelMode('edit');
    setExpandedUtilityPanel('transform');
    window.setTimeout(() => runRefinement(presetId), 0);
  };

  const toggleUtilityPanel = (panel: Exclude<UtilityPanel, 'none'>) => {
    setExpandedUtilityPanel((current) => current === panel ? 'none' : panel);
    if (panel !== 'workspace' && panel !== 'project') {
      setComposerSurface(null);
    }
  };

  const openConstellationForRelationship = (relationship: VisibleRelationship) => {
    setPanelMode('constellation');
    onInspectRelationship(relationship.id);
  };

  return (
    <section className="expanded-note-shell" style={{ ['--thinking-rail-reserved' as string]: `${rightInset}px` }}>
      <aside ref={panelRef} className="expanded-note expanded-note--rescue note-surface note-surface--modal" data-panel-mode={panelMode} style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        <header className="expanded-note-header expanded-note-header--calm" onPointerDown={(event: PointerEvent<HTMLElement>) => {
          const target = event.target as HTMLElement;
          if (target.closest('button, input, textarea, select, label, summary')) return;
          event.preventDefault();
          setDragState({ dx: event.clientX - position.x, dy: event.clientY - position.y });
        }}>
          <div className="expanded-note-header-main">
            <input className="note-title-field" aria-label="Note title" placeholder="Untitled note" value={note.title ?? ''} onChange={(event) => onChange(note.id, { title: event.target.value })} />
            <div className="body-mode-switch" role="tablist" aria-label="Note surface mode">
              <ModeButton active={panelMode === 'read'} onClick={() => setPanelMode('read')}>Read</ModeButton>
              <ModeButton active={panelMode === 'edit'} onClick={() => setPanelMode('edit')}>Edit</ModeButton>
              <ModeButton active={panelMode === 'constellation'} onClick={() => setPanelMode('constellation')}>Constellation</ModeButton>
              <ModeButton active={panelMode === 'source'} onClick={() => setPanelMode('source')}>
                <span className="note-tab-label-desktop">Source</span>
                <span className="note-tab-label-mobile">Materials</span>
              </ModeButton>
            </div>
          </div>
          <div className="note-header-tools note-header-tools--compact">
            {panelMode === 'edit' ? (
              <button
                type="button"
                className={`ghost-button note-assist-toggle ${editAssistOpen ? 'active' : ''}`}
                onClick={() => setEditAssistOpen((current) => !current)}
              >
                {editAssistOpen ? 'Hide helpers' : `Show helpers${helperSuggestionCount ? ` (${helperSuggestionCount})` : ''}`}
              </button>
            ) : null}
            <button type="button" className="ghost-button note-mobile-close" onClick={onClose} aria-label="Close note">Close</button>
            <details className="note-danger-menu" open={showDangerActions} onToggle={(event) => setShowDangerActions((event.currentTarget as HTMLDetailsElement).open)}>
              <summary className="ghost-button">More</summary>
              <div className="note-danger-menu__panel note-danger-menu__panel--quiet">
                <button type="button" className="ghost-button note-mobile-overflow-only" onClick={() => setPanelMode('constellation')}>Constellation</button>
                <button type="button" className="ghost-button note-mobile-overflow-only" onClick={() => setPanelMode('source')}>Materials</button>
                {panelMode === 'edit' ? (
                  <button type="button" className="ghost-button note-mobile-overflow-only" onClick={() => setEditAssistOpen((current) => !current)}>
                    {editAssistOpen ? 'Hide helpers' : 'Show helpers'}
                  </button>
                ) : null}
                <button type="button" className="ghost-button note-mobile-overflow-only" onClick={onFocusLensPin}>{focusLensPinned ? 'Unpin layout' : 'Pin layout'}</button>
                <button type="button" className="ghost-button note-mobile-overflow-only" onClick={onFocusLensReset}>Reset view</button>
                {focusLensCanGoBack ? <button type="button" className="ghost-button" onClick={onFocusLensBack}>Back</button> : null}
                <IconToolButton
                  label="Think about this note"
                  kind="thinking"
                  pressed={thinkingActive}
                  pulse={hasFreshInsights && !thinkingActive}
                  onClick={onThinkAboutNote}
                />
                <button type="button" className="ghost-button" onClick={() => onToggleFocus(note.id)}>{isFocus ? 'Remove focus' : 'Mark focus'}</button>
                {note.intent === 'task' ? (
                  <button type="button" className="ghost-button" onClick={() => onSetTaskState(note.id, note.taskState === 'done' ? 'open' : 'done')}>
                    {getTaskStateLabel(note.taskState)}
                  </button>
                ) : null}
                <button type="button" className="ghost-button" onClick={() => (note.archived ? onRestoreArchive(note.id) : onArchive(note.id))}>
                  {note.archived ? 'Restore from archive' : 'Archive'}
                </button>
                <button type="button" className="ghost-button note-danger-action" onClick={() => onDelete(note.id)}>Delete</button>
              </div>
            </details>
          </div>
        </header>

        <div className="expanded-note-layout expanded-note-layout--single-column">
          {panelMode === 'read' ? (
            <div className="expanded-note-main expanded-note-main--reading">
              <aside className="note-identity-trace note-cornell-cues" aria-label="Related cues">
                <span className={`note-trace-meta ${noteWorkspace ? '' : 'is-muted'}`}>{noteWorkspace ? `Workspace · ${workspaceSummary}` : 'Workspace unassigned'}</span>
                {noteProjects.length ? <span className="note-trace-meta">Threads · {threadSummary}</span> : null}
                {visibleTraceNotes.map((relationship) => (
                  <button
                    key={relationship.relationshipId}
                    type="button"
                    className={`note-trace-link ${hoveredRelatedNoteId === relationship.targetId ? 'is-active' : ''}`}
                    onMouseEnter={() => onHoverRelatedNote(relationship.targetId)}
                    onMouseLeave={() => onClearRelatedHover(relationship.targetId)}
                    onClick={() => onOpenRelated(relationship.targetId, relationship.relationshipId)}
                  >
                    <span>{getPlainEnglishRelationshipCue(relationship.relationship)}</span>
                    <strong>{relationship.targetTitle}</strong>
                  </button>
                ))}
                {traceOverflow > 0 ? <span className="note-trace-overflow">+{traceOverflow} linked</span> : null}
              </aside>
              <div className="note-body-surface note-cornell-body" data-mode="read">
                <MarkdownProjectionView
                  source={note.body}
                  note={note}
                  taskStatesById={taskStatesById}
                  activeTaskId={note.intent === 'task' ? note.id : null}
                  onOpenTask={(taskNoteId) => {
                    const relationship = sceneRelationshipForTask(taskNoteId, note.id, relationships);
                    if (relationship) {
                      onOpenRelated(taskNoteId, relationship.id);
                      return;
                    }
                    onHoverRelatedNote(taskNoteId);
                    window.setTimeout(() => onClearRelatedHover(taskNoteId), 900);
                  }}
                  onToggleCheckbox={(lineIndex, checked) => onChange(note.id, {
                    body: toggleChecklistItem(note.body, { lineIndex }, checked)
                  })}
                />
              </div>


              {studyActionsEnabled ? (
                <details className="study-support-disclosure">
                  <summary>Learning helpers</summary>
                  <StudySupportPanel
                    enabled={Boolean(studyActionsEnabled)}
                    blocks={studySupportBlocks ?? []}
                    onRunAction={(action, userAnswer) => onRunStudyAction?.(action, userAnswer)}
                    onRemoveBlock={(blockId) => onRemoveStudyBlock?.(note.id, blockId)}
                  />
                </details>
              ) : null}

              {resolvedPromotedFragments.length ? (
                <div className="inline-task-strip" aria-label="Inline task links">
                  {resolvedPromotedFragments.map((fragment) => {
                    const taskNote = notesById.get(fragment.taskNoteId);
                    const taskState = taskStatesById.get(fragment.taskNoteId);
                    return (
                      <button
                        key={fragment.id}
                        type="button"
                        className={`inline-task-strip-chip inline-task-strip-chip--${taskState ?? 'open'}`}
                        onClick={() => {
                          const relationship = sceneRelationshipForTask(fragment.taskNoteId, note.id, relationships);
                          if (relationship) onOpenRelated(fragment.taskNoteId, relationship.id);
                        }}
                      >
                        <strong>{taskNote ? getCompactDisplayTitle(taskNote, 28) : fragment.text}</strong>
                        <small>{getTaskStateLabel(taskState)}</small>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <section className="detail-section detail-section--constellation-summary note-cornell-summary" aria-label="Cornell summary">
                <div className="section-head">
                  <div>
                    <strong>Constellation</strong>
                    <p className="section-hint section-hint--constellation">{constellationIntro}</p>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => setPanelMode('constellation')}>Open constellation</button>
                </div>
                <div className="constellation-summary-grid">
                  <div><span>Upstream</span><strong>{upstreamCount}</strong></div>
                  <div><span>Downstream</span><strong>{downstreamCount}</strong></div>
                  <div><span>Nearby</span><strong>{nearbyCount}</strong></div>
                  <div><span>Faint context</span><strong>{faintContextCount}</strong></div>
                </div>
              </section>

              <div className="note-quiet-utilities">
                <LowerDisclosure
                  title="Sources"
                  summary={
                    sourceHealth.hasOrphanedEvidence
                      ? 'Integrity check needed'
                      : attachmentCount
                        ? `${attachmentReadyCount}/${attachmentCount} ready`
                        : sourceNote
                          ? 'Linked source available'
                          : 'Quiet until needed'
                  }
                  open={sourceSectionOpen}
                  onToggle={() => toggleUtilityPanel('sources')}
                >
                  <div className={`source-health-chip source-health-chip--${sourceHealth.sourceHealthStatus}`}>
                    <strong>Source integrity: {sourceHealthSummaryLabel}</strong>
                    {sourceHealth.breakTypes.length ? <small>Breaks: {sourceHealth.breakTypes.join(', ').replace(/_/g, ' ')}</small> : null}
                  </div>
                  {sourceHealth.hasUnverifiedConclusions ? (
                    <div className="source-health-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => onChange(note.id, { verificationState: 'needs-review', verificationReason: 'Source integrity degraded' })}
                      >
                        Mark conclusions unverified
                      </button>
                    </div>
                  ) : null}
                  {orphanedReferences.length ? (
                    <div className="source-health-list" aria-label="Orphaned source references">
                      {orphanedReferences.map((reference) => (
                        <div key={reference.id} className="source-health-row">
                          <div>
                            <strong>{reference.label}</strong>
                            <small>{reference.breakType?.replace('_', ' ') ?? 'integrity break'} · {reference.breakDetail ?? 'Needs relink'}</small>
                          </div>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => {
                              if (!note.provenance) return;
                              onChange(note.id, { provenance: relinkExternalReference(note.provenance, reference.id) });
                            }}
                          >
                            Relink source
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {note.intent === 'task' && sourceNote && note.taskSource ? (
                    <button
                      type="button"
                      className="task-origin-card"
                      onClick={() => {
                        const relationship = sceneRelationshipForTask(note.id, sourceNote.id, relationships);
                        if (relationship) onOpenRelated(sourceNote.id, relationship.id);
                      }}
                    >
                      <strong>{getCompactDisplayTitle(sourceNote, 38)}</strong>
                      <p>{sourceSnippet}</p>
                      <small>Open source note</small>
                    </button>
                  ) : null}
                  <AttachmentPanel
                    attachments={note.attachments ?? []}
                    onAddAttachments={onAddAttachments}
                    onRemoveAttachment={onRemoveAttachment}
                    onRetryAttachment={onRetryAttachment}
                  />
                </LowerDisclosure>

                <LowerDisclosure
                  title="Transform"
                  summary={thinkingActive ? 'Thinking rail is open' : 'One quiet transform at a time'}
                  open={transformSectionOpen}
                  onToggle={() => toggleUtilityPanel('transform')}
                >
                  {!thinkingActive ? (
                    <RefinementComposer
                      selectionActive={Boolean(selectedTextRange?.text.trim())}
                      preview={refinementPreview}
                      previewDraft={refinementPreviewDraft}
                      customInstruction={customRefinementInstruction}
                      onSelectPreset={runRefinement}
                      onCustomInstructionChange={setCustomRefinementInstruction}
                      onRunCustom={() => runRefinement('custom')}
                      onPreviewDraftChange={setRefinementPreviewDraft}
                      onApplyReplace={applyRefinementReplace}
                      onApplyInsertBelow={applyRefinementInsertBelow}
                      onCancelPreview={clearRefinementPreview}
                    />
                  ) : null}
                  <div className="quiet-action-row">
                    <button type="button" className="ghost-button" onClick={() => runOutcomeRefinement('clarify')}>Clarify</button>
                    <button type="button" className="ghost-button" onClick={() => runOutcomeRefinement('executive_summary')}>Exec summary</button>
                    <button type="button" className="ghost-button" onClick={() => runOutcomeRefinement('summarize')}>Summarize</button>
                    <button type="button" className="ghost-button" onClick={() => setPanelMode('edit')}>Open editor</button>
                  </div>
                </LowerDisclosure>
              </div>
            </div>
          ) : null}

          {panelMode === 'edit' ? (
            <div className="expanded-note-main expanded-note-main--edit" data-helpers-visible={helperUI.visible ? 'true' : 'false'}>
              <div className="note-body-surface" data-mode="edit">
                <div className="note-edit-stack">
                  {!thinkingActive && transformSectionOpen ? (
                    <RefinementComposer
                      selectionActive={Boolean(selectedTextRange?.text.trim())}
                      preview={refinementPreview}
                      previewDraft={refinementPreviewDraft}
                      customInstruction={customRefinementInstruction}
                      onSelectPreset={runRefinement}
                      onCustomInstructionChange={setCustomRefinementInstruction}
                      onRunCustom={() => runRefinement('custom')}
                      onPreviewDraftChange={setRefinementPreviewDraft}
                      onApplyReplace={applyRefinementReplace}
                      onApplyInsertBelow={applyRefinementInsertBelow}
                      onCancelPreview={clearRefinementPreview}
                    />
                  ) : null}

                  <InlineNoteLinkEditor
                    note={note}
                    notes={notes}
                    relationshipsByTargetId={relationshipsByTargetId}
                    highlightedTargetId={inlineHighlightedTargetId}
                    proactiveSuggestions={visibleProactiveSuggestions}
                    onBodyChange={(body) => onChange(note.id, { body })}
                    onPromoteSelectionToTask={(selection) => {
                      const result = onPromoteFragmentToTask(note.id, selection);
                      if (result.taskNoteId) flashInlineTarget(result.taskNoteId);
                      setPanelMode('read');
                    }}
                    onCreateLink={({ targetId, type }) => {
                      onCreateExplicitLink(note.id, targetId, type);
                      flashInlineTarget(targetId);
                    }}
                    onCreateLinkedNote={(title, type) => {
                      const targetId = onCreateInlineLinkedNote(note.id, title, type);
                      if (targetId) flashInlineTarget(targetId);
                      return targetId;
                    }}
                    onUpdateRelationshipType={(relationshipId, type, targetId) => {
                      const relationship = relationships.find((item) => item.id === relationshipId);
                      if (!relationship) return;
                      onUpdateRelationship(relationshipId, type, relationship.fromId, relationship.toId);
                      flashInlineTarget(targetId);
                    }}
                    onHighlightTarget={(targetId) => {
                      setInlineHighlightedTargetId(targetId);
                      onHoverRelatedNote(targetId);
                    }}
                    onClearHighlight={(targetId) => {
                      onClearRelatedHover(targetId);
                      setInlineHighlightedTargetId((current) => (current === targetId ? null : current));
                    }}
                    onAcceptProactiveSuggestion={(suggestionId) => {
                      const suggestion = visibleProactiveSuggestions.find((item) => item.id === suggestionId);
                      if (!suggestion) return;
                      acceptSuggestedLink(suggestion);
                    }}
                    onDismissProactiveSuggestion={(suggestionId) => {
                      setDismissedSuggestionIds((current) => [...new Set([...current, suggestionId])]);
                    }}
                    onChangeProactiveSuggestionType={(suggestionId, type) => {
                      setSuggestionTypeOverrides((current) => ({ ...current, [suggestionId]: type }));
                    }}
                    onSelectionChange={setSelectedTextRange}
                    sourceJumpRequest={sourceJumpRequest}
                    onSourceJumpConsumed={() => setSourceJumpRequest(null)}
                    showProactiveSuggestions={helperUI.showProactiveSuggestions}
                  />
                </div>
              </div>

              {helperUI.showFollowUps ? (
                <section className="capture-followups" aria-label="Likely follow-up suggestions">
                  <div className="section-head">
                    <div>
                      <strong>Likely follow-ups</strong>
                      <p className="section-hint">Optional suggestions from this note only. Nothing becomes a task until you promote it.</p>
                    </div>
                    <span className="section-meta">{likelyActionFragments.length} suggestions</span>
                  </div>
                  <div className="capture-followups__list">
                    {likelyActionFragments.map((fragment) => (
                      <div key={fragment.id} className="capture-followups__row">
                        <div>
                          <strong>{fragment.text}</strong>
                          <small>{fragment.reason}</small>
                        </div>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setSourceJumpRequest({ start: fragment.start, end: fragment.end, nonce: Date.now() })}
                        >
                          Jump to source
                        </button>
                        {fragment.semanticType === 'follow_up' ? (
                          <>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => onChange(note.id, { body: applyFollowUpLifecycleAction(note.body, fragment, 'accept') })}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => onChange(note.id, { body: applyFollowUpLifecycleAction(note.body, fragment, 'dismiss') })}
                            >
                              Dismiss
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => {
                            if (fragment.semanticType === 'follow_up') {
                              onChange(note.id, { body: applyFollowUpLifecycleAction(note.body, fragment, 'promote_to_task') });
                            }
                            const result = onPromoteFragmentToTask(note.id, fragment);
                            if (result.taskNoteId) flashInlineTarget(result.taskNoteId);
                          }}
                        >
                          Promote to task
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {helperUI.visible ? <div className="note-quiet-utilities">
                <LowerDisclosure
                  title="Transform"
                  summary={thinkingActive ? 'Thinking rail is open' : 'Refine only when needed'}
                  open={transformSectionOpen}
                  onToggle={() => toggleUtilityPanel('transform')}
                >
                  {!thinkingActive ? (
                    <RefinementComposer
                      selectionActive={Boolean(selectedTextRange?.text.trim())}
                      preview={refinementPreview}
                      previewDraft={refinementPreviewDraft}
                      customInstruction={customRefinementInstruction}
                      onSelectPreset={runRefinement}
                      onCustomInstructionChange={setCustomRefinementInstruction}
                      onRunCustom={() => runRefinement('custom')}
                      onPreviewDraftChange={setRefinementPreviewDraft}
                      onApplyReplace={applyRefinementReplace}
                      onApplyInsertBelow={applyRefinementInsertBelow}
                      onCancelPreview={clearRefinementPreview}
                    />
                  ) : null}
                </LowerDisclosure>

                <LowerDisclosure title="Anchored in" summary={workspaceSummary} open={workspaceSectionOpen} onToggle={() => toggleUtilityPanel('workspace')}>
                  <div className="section-head section-head--icon-action">
                    <div><small className="section-hint">Give this note a home so nearby paths stay oriented.</small></div>
                    <IconToolButton
                      label={showWorkspaceComposer ? 'Close place maker' : 'Add a new place'}
                      kind="workspace"
                      pressed={showWorkspaceComposer}
                      onClick={() => setComposerSurface((current) => current === 'workspace' ? null : 'workspace')}
                    />
                  </div>
                  <div className="organize-choice-list">
                    <label className="project-membership-row project-membership-row--empty">
                      <input type="radio" name={`workspace-${note.id}`} checked={!note.workspaceId} onChange={() => onSetWorkspaceId(note.id, null)} />
                      <span><strong>Assign later</strong><small>Keep this note in the shared field for now.</small></span>
                    </label>
                    {workspaces.map((workspace) => (
                      <label key={workspace.id} className="project-membership-row" style={{ ['--project-accent' as string]: workspace.color }}>
                        <input type="radio" name={`workspace-${note.id}`} checked={note.workspaceId === workspace.id} onChange={() => onSetWorkspaceId(note.id, workspace.id)} />
                        <span><strong>{workspace.name}</strong><small>{workspace.key}</small></span>
                      </label>
                    ))}
                  </div>
                  {showWorkspaceComposer ? (
                    <div className="project-compose-inline">
                      <div className="project-compose-grid">
                        <input aria-label="Workspace key" placeholder="Key (OPS)" value={workspaceDraft.key ?? ''} onChange={(event) => setWorkspaceDraft((prev) => ({ ...prev, key: event.target.value }))} />
                        <input aria-label="Workspace name" placeholder="Place name" value={workspaceDraft.name ?? ''} onChange={(event) => setWorkspaceDraft((prev) => ({ ...prev, name: event.target.value }))} />
                        <input aria-label="Workspace color" type="color" value={workspaceDraft.color ?? '#5fbf97'} onChange={(event) => setWorkspaceDraft((prev) => ({ ...prev, color: event.target.value }))} />
                      </div>
                      <textarea aria-label="Workspace description" placeholder="What kind of place is this note settling into?" value={workspaceDraft.description ?? ''} onChange={(event) => setWorkspaceDraft((prev) => ({ ...prev, description: event.target.value }))} />
                      <button onClick={() => { if (!(workspaceDraft.key ?? workspaceDraft.name ?? '').trim()) return; onCreateWorkspace(note.id, workspaceDraft); setWorkspaceDraft(DEFAULT_WORKSPACE_DRAFT); setComposerSurface(null); }}>Create place</button>
                    </div>
                  ) : null}
                </LowerDisclosure>

                <LowerDisclosure title="Shared threads" summary={threadSummary} open={projectSectionOpen} onToggle={() => toggleUtilityPanel('project')}>
                  <div className="section-head section-head--icon-action">
                    <div><small className="section-hint">Let the note join a few larger storylines when it helps.</small></div>
                    <IconToolButton
                      label={showProjectComposer ? 'Close thread maker' : 'Add a new thread'}
                      kind="project"
                      pressed={showProjectComposer}
                      onClick={() => setComposerSurface((current) => current === 'project' ? null : 'project')}
                    />
                  </div>
                  {projects.length ? (
                    <div className="organize-choice-list">
                      {projects.map((project) => (
                        <label key={project.id} className="project-membership-row" style={{ ['--project-accent' as string]: project.color }}>
                          <input type="checkbox" checked={noteProjectIds.has(project.id)} onChange={(event) => {
                            const next = event.target.checked ? [...note.projectIds, project.id] : note.projectIds.filter((projectId) => projectId !== project.id);
                            onSetProjectIds(note.id, next);
                          }} />
                          <span><strong>{project.name}</strong><small>{project.key}</small></span>
                        </label>
                      ))}
                    </div>
                  ) : <p className="relations-empty relations-empty--attention">No threads yet. Add one only when this note needs a shared storyline.</p>}
                  {showProjectComposer ? (
                    <div className="project-compose-inline">
                      <div className="project-compose-grid">
                        <input aria-label="Project key" placeholder="Key (SLD)" value={projectDraft.key ?? ''} onChange={(event) => setProjectDraft((prev) => ({ ...prev, key: event.target.value }))} />
                        <input aria-label="Project name" placeholder="Thread name" value={projectDraft.name ?? ''} onChange={(event) => setProjectDraft((prev) => ({ ...prev, name: event.target.value }))} />
                        <input aria-label="Project color" type="color" value={projectDraft.color ?? '#7aa2f7'} onChange={(event) => setProjectDraft((prev) => ({ ...prev, color: event.target.value }))} />
                      </div>
                      <textarea aria-label="Project description" placeholder="What larger thread brings these notes together?" value={projectDraft.description ?? ''} onChange={(event) => setProjectDraft((prev) => ({ ...prev, description: event.target.value }))} />
                      <button onClick={() => { if (!(projectDraft.key ?? projectDraft.name ?? '').trim()) return; onCreateProject(note.id, projectDraft); setProjectDraft(DEFAULT_PROJECT_DRAFT); setComposerSurface(null); }}>Create thread</button>
                    </div>
                  ) : null}
                </LowerDisclosure>
              </div> : null}
            </div>
          ) : null}

          {panelMode === 'source' ? (
            <div className="expanded-note-main expanded-note-main--source-mode">
              {note.intent === 'task' && sourceNote && note.taskSource ? (
                <section className="detail-section detail-section--constellation-subsection" aria-label="Origin">
                  <div className="section-head">
                    <div>
                      <strong>Origin</strong>
                      <small className="section-hint">This task stays tethered to the note fragment it came from.</small>
                    </div>
                    <span className="section-meta">{getTaskStateLabel(note.taskState)}</span>
                  </div>
                  <button
                    type="button"
                    className="task-origin-card"
                    onClick={() => {
                      const relationship = sceneRelationshipForTask(note.id, sourceNote.id, relationships);
                      if (relationship) onOpenRelated(sourceNote.id, relationship.id);
                    }}
                  >
                    <strong>{getCompactDisplayTitle(sourceNote, 38)}</strong>
                    <p>{sourceSnippet}</p>
                    <small>Open source note</small>
                  </button>
                </section>
              ) : null}

              <section className="detail-section detail-section--source-surface" aria-label="Files and materials">
                <AttachmentPanel
                  attachments={note.attachments ?? []}
                  onAddAttachments={onAddAttachments}
                  onRemoveAttachment={onRemoveAttachment}
                  onRetryAttachment={onRetryAttachment}
                  showSectionHeading={false}
                />
              </section>

              {attachmentCount > 0 ? (
                <LowerDisclosure
                  title="Transform"
                  summary={thinkingActive ? 'Thinking rail is open' : 'Source-aware transforms'}
                  open={transformSectionOpen}
                  onToggle={() => toggleUtilityPanel('transform')}
                >
                  {!thinkingActive ? (
                    <RefinementComposer
                      selectionActive={Boolean(selectedTextRange?.text.trim())}
                      preview={refinementPreview}
                      previewDraft={refinementPreviewDraft}
                      customInstruction={customRefinementInstruction}
                      onSelectPreset={runRefinement}
                      onCustomInstructionChange={setCustomRefinementInstruction}
                      onRunCustom={() => runRefinement('custom')}
                      onPreviewDraftChange={setRefinementPreviewDraft}
                      onApplyReplace={applyRefinementReplace}
                      onApplyInsertBelow={applyRefinementInsertBelow}
                      onCancelPreview={clearRefinementPreview}
                    />
                  ) : null}
                </LowerDisclosure>
              ) : null}
            </div>
          ) : null}

          {panelMode === 'constellation' ? (
            <div className="expanded-note-main expanded-note-main--constellation-mode">
              <section className="detail-section detail-section--constellation detail-section--constellation-orbital" aria-label="Constellation">
                <div className="section-head">
                  <div>
                    <strong>Constellation</strong>
                    <p className="section-hint section-hint--constellation">{constellationIntro}</p>
                  </div>
                  <span className="section-meta">{relationships.length} direct · {faintContextCount} faint context</span>
                </div>

                <div className="constellation-filter-strip" role="toolbar" aria-label="Constellation filters">
                  <button type="button" className={constellationFilter === 'all' ? 'active' : ''} onClick={() => setConstellationFilter('all')}>All</button>
                  {connectedGroups.filter((group) => group.items.length).map((group) => (
                    <button key={group.key} type="button" onClick={() => setConstellationFilter(group.items[0].type)}>
                      {group.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setPanelMode('read')}>Back to note</button>
                </div>

                <div className="constellation-orbital-surface">
                  <RelationshipGraph
                    focalNote={note}
                    focalNotePosition={{ x: 300, y: 250 }}
                    relationships={constellationRelationships}
                    notes={graphNotes}
                    activeFilter={constellationFilter === 'all' ? null : constellationFilter}
                    ringByRelationshipId={ringByRelationshipId}
                    onNodeClick={(noteId) => {
                      const matching = relationships.find((relationship) => relationship.targetId === noteId) ?? constellationRelationships.find((relationship) => relationship.toId === noteId || relationship.fromId === noteId);
                      if (matching) {
                        onOpenRelated(noteId, matching.id);
                      }
                    }}
                  />
                </div>

                <div className="connections-flow-list connections-flow-list--compact" aria-label="Constellation map">
                  {activeRelationshipRows.some((group) => group.items.length) ? activeRelationshipRows.map((group) => (
                    group.items.length ? (
                      <section key={group.key} className="connections-flow-group" aria-label={group.label}>
                        <div className="connections-flow-head">
                          <strong>{group.label}</strong>
                          <span>{group.items.length}</span>
                        </div>

                        <div className="relations-list relations-list--quiet">
                          {group.items.map((relationship) => (
                            <button
                              key={relationship.id}
                              type="button"
                              className={`relation-row relation-row--compact relation-row--${relationship.explicitness} relation-row--${group.key} relation-row--${getRelationshipTone(note.id, relationship)}`}
                              onMouseEnter={() => onHoverRelatedNote(relationship.targetId)}
                              onMouseLeave={() => onClearRelatedHover(relationship.targetId)}
                              onClick={() => openConstellationForRelationship(relationship)}
                            >
                              <div className="relation-heading">
                                <span className="relation-title">{relationship.targetTitle}</span>
                                <small>
                                  <span className="relation-direction-indicator" aria-hidden="true">
                                    {group.key === 'upstream' ? '←' : group.key === 'downstream' ? '→' : '↔'}
                                  </span>
                                  {getFlowLabel(note.id, relationship)} · {formatRelationshipType(relationship.type)} · {relationship.explicitness === 'inferred' ? 'Soft signal' : 'Direct link'}
                                </small>
                              </div>
                              {relationship.explicitness === 'inferred' ? <p className="relation-explanation">{relationship.explanation}</p> : null}
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null
                  )) : <p className="relations-empty">The local map is still empty.</p>}
                </div>
              </section>

              {inspectedRelationship && inspectedFrom && inspectedTo ? (
                <section className="relationship-inspector relationship-inspector--modal" aria-label="Connection detail">
                  <div className="section-head">
                    <strong>Connection detail</strong>
                    <div className="relationship-inspector-actions">
                      {canUndoRelationshipEdit ? <button className="ghost-button" onClick={onUndoRelationshipEdit}>Undo last change</button> : null}
                      <button className="ghost-button" onClick={onCloseRelationshipInspector}>Close detail</button>
                    </div>
                  </div>

                  <dl className="relationship-inspector-grid">
                    <div>
                      <dt>From</dt>
                      <dd>{getCompactDisplayTitle(inspectedFrom, 34)}</dd>
                    </div>
                    <div>
                      <dt>To</dt>
                      <dd>{getCompactDisplayTitle(inspectedTo, 34)}</dd>
                    </div>
                    <div>
                      <dt>Current path</dt>
                      <dd>{formatRelationshipType(inspectedRelationship.type)}</dd>
                    </div>
                    <div>
                      <dt>Flow</dt>
                      <dd>{describeDirection(getCompactDisplayTitle(inspectedFrom, 18), getCompactDisplayTitle(inspectedTo, 18), inspectedRelationship.directional)}</dd>
                    </div>
                    <div>
                      <dt>Read</dt>
                      <dd>{inspectedRelationship.explicitness === 'explicit' ? 'Directly linked' : inspectedRelationship.state === 'confirmed' ? 'Confirmed soft signal' : 'Soft signal awaiting confirmation'}</dd>
                    </div>
                  </dl>

                  <label className="relationship-inspector-field">
                    <span>Path style</span>
                    <select value={inspectorType} onChange={(event) => setInspectorType(event.target.value as RelationshipType)}>
                      {Object.entries(groupedRelationshipOptions).map(([group, options]) => (
                        <optgroup key={group} label={group}>
                          {options.map(({ type, label }) => <option key={type} value={type}>{label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </label>

                  {previewDirectional ? (
                    <div className="relationship-preview-card">
                      <div>
                        <strong>Preview path</strong>
                        <p>{describeDirection(previewFromLabel, previewToLabel, true)}</p>
                      </div>
                      <button className="ghost-button" onClick={() => setPreviewDirectionReversed((value) => !value)}>Reverse flow</button>
                    </div>
                  ) : null}

                  {directionalityChanged ? (
                    <p className="relationship-inspector-note">
                      This changes the path from {inspectedRelationship.directional ? 'one-way flow' : 'shared flow'} to {previewDirectional ? 'one-way flow' : 'shared flow'}.
                      Check the preview so the map stays easy to read.
                    </p>
                  ) : null}

                  {explicitnessWillChange ? (
                    <p className="relationship-inspector-note">
                      Saving keeps this same path and turns it into a direct link, so the map reflects a confirmed connection instead of a lingering hint.
                    </p>
                  ) : (
                    <p className="relationship-inspector-note">
                      Saving updates this path in place and refreshes the web without creating a duplicate line.
                    </p>
                  )}

                  <div className="relationship-inspector-footer">
                    <button
                      onClick={() => onUpdateRelationship(inspectedRelationship.id, inspectorType, previewFromId, previewToId)}
                      disabled={
                        inspectedRelationship.type === inspectorType &&
                        inspectedRelationship.fromId === previewFromId &&
                        inspectedRelationship.toId === previewToId
                      }
                    >
                      Save path
                    </button>
                    <button className="ghost-button" onClick={() => onOpenRelated(inspectedRelationship.toId === note.id ? inspectedRelationship.fromId : inspectedRelationship.toId, inspectedRelationship.id)}>
                      Follow to note
                    </button>
                    {inspectedRelationship.explicitness === 'explicit' ? (
                      <button className="ghost-button relation-remove" onClick={() => onRemoveRelationship(inspectedRelationship.id)}>
                        Remove link
                      </button>
                    ) : null}
                    {inspectedRelationship.explicitness === 'inferred' && inspectedRelationship.state === 'proposed' ? (
                      <button className="ghost-button" onClick={() => onConfirmRelationship(inspectedRelationship.id)}>Keep inferred link</button>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
