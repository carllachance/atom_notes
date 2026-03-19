import {
  DETAIL_SURFACE_RELATIONSHIP_OPTIONS,
  DetailSurfaceRelationshipOption,
  getDetailSurfaceRelationshipOption
} from '../detailSurface/detailSurfaceModel';
import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
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
import { toggleMarkdownCheckbox } from '../markdownProjection';
import { getCompactDisplayTitle } from '../noteText';
import { isRelationshipTypeDirectional } from '../relationshipLogic';
import { getProactiveLinkSuggestions, ProactiveLinkSuggestion } from '../relationships/inlineLinking';
import { getResolvedTaskFragments, getTaskStateLabel } from '../tasks/taskPromotions';
import { getLikelyActionFragments } from '../tasks/actionFragmentSuggestions';
import { ProjectDraft } from '../projects/projectModel';
import { WorkspaceDraft } from '../workspaces/workspaceModel';
import { NoteCardModel, Project, Relationship, RelationshipType, Workspace } from '../types';
import { AttachmentPanel } from './attachments/AttachmentPanel';

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
  onPositionChange?: (noteId: string, position: { x: number; y: number }) => void;
};

type DragState = { dx: number; dy: number };
type BodyMode = 'read' | 'edit';
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function getRelationshipTone(noteId: string, relationship: VisibleRelationship) {
  if (relationship.type === 'depends_on') return 'dependency';
  if (getFlowGroup(noteId, relationship) === 'downstream' || ['supports', 'leads_to'].includes(relationship.type)) return 'forward';
  return 'neutral';
}

function summarizeConnectionFlows(groups: Array<{ label: string; items: VisibleRelationship[] }>) {
  const visible = groups.filter((group) => group.items.length);
  if (!visible.length) return 'Nothing else is surfacing around this note yet.';
  return visible.map((group) => `${group.label} ${group.items.length}`).join(' · ');
}

function getConstellationIntro(groups: Array<{ key: 'upstream' | 'downstream' | 'nearby'; items: VisibleRelationship[] }>) {
  const upstream = groups.find((group) => group.key === 'upstream')?.items.length ?? 0;
  const downstream = groups.find((group) => group.key === 'downstream')?.items.length ?? 0;
  const nearby = groups.find((group) => group.key === 'nearby')?.items.length ?? 0;

  if (!upstream && !downstream && !nearby) {
    return 'The map is quiet for now. As this note starts touching other notes, they will gather here.';
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

function getSuggestionDockIntro(suggestions: SuggestedLinkRow[]) {
  const reasons = new Set(suggestions.map((suggestion) => suggestion.reason));
  if (reasons.has('Shared tags.')) return 'Surfaced from shared tags and nearby note context.';
  if (reasons.has('Same project context.') || reasons.has('Same project and overlapping language.')) return 'Surfaced from shared project context and nearby language.';
  if (reasons.has('Same workspace.') || reasons.has('Same workspace and overlapping language.')) return 'Surfaced from shared workspace context and nearby language.';
  if (reasons.has('Related workflow step.')) return 'Surfaced from likely workflow steps around this note.';
  return 'Surfaced from overlapping language and recent note context.';
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
  onPositionChange
}: ExpandedNoteProps) {
  const [showProjectComposer, setShowProjectComposer] = useState(false);
  const [showWorkspaceComposer, setShowWorkspaceComposer] = useState(false);
  const [workspaceSectionOpen, setWorkspaceSectionOpen] = useState(false);
  const [projectSectionOpen, setProjectSectionOpen] = useState(false);
  const [showDangerActions, setShowDangerActions] = useState(false);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(DEFAULT_PROJECT_DRAFT);
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDraft>(DEFAULT_WORKSPACE_DRAFT);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bodyMode, setBodyMode] = useState<BodyMode>('read');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [inspectorType, setInspectorType] = useState<RelationshipType>('related');
  const [previewDirectionReversed, setPreviewDirectionReversed] = useState(false);
  const [inlineHighlightedTargetId, setInlineHighlightedTargetId] = useState<string | null>(null);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const [suggestionTypeOverrides, setSuggestionTypeOverrides] = useState<Record<string, RelationshipType>>({});
  const [linkSuggestionsExpanded, setLinkSuggestionsExpanded] = useState(false);
  const [freshSuggestionsVisible, setFreshSuggestionsVisible] = useState(false);
  const [selectedTextRange, setSelectedTextRange] = useState<TextSelection | null>(null);
  const [customRefinementInstruction, setCustomRefinementInstruction] = useState('');
  const [refinementPreview, setRefinementPreview] = useState<RefinementSuggestion | null>(null);
  const [refinementPreviewDraft, setRefinementPreviewDraft] = useState('');
  const panelRef = useRef<HTMLElement | null>(null);
  const constellationSectionRef = useRef<HTMLElement | null>(null);
  const organizationSectionRef = useRef<HTMLElement | null>(null);
  const inlineHighlightTimerRef = useRef<number | null>(null);
  const freshSuggestionsTimerRef = useRef<number | null>(null);
  const previousSuggestionSignatureRef = useRef('');

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
    setBodyMode(note?.trace === 'captured' ? 'edit' : 'read');
    setShowProjectComposer(false);
    setShowWorkspaceComposer(false);
    setWorkspaceSectionOpen(false);
    setProjectSectionOpen(false);
    setShowDangerActions(false);
    setProjectDraft(DEFAULT_PROJECT_DRAFT);
    setWorkspaceDraft(DEFAULT_WORKSPACE_DRAFT);
    setInlineHighlightedTargetId(null);
    setDismissedSuggestionIds([]);
    setSuggestionTypeOverrides({});
    setLinkSuggestionsExpanded(false);
    setFreshSuggestionsVisible(false);
    setSelectedTextRange(null);
    setCustomRefinementInstruction('');
    setRefinementPreview(null);
    setRefinementPreviewDraft('');
    previousSuggestionSignatureRef.current = '';
  }, [initialPosition, note?.id, note?.trace]);

  useEffect(() => {
    return () => {
      if (inlineHighlightTimerRef.current) window.clearTimeout(inlineHighlightTimerRef.current);
      if (freshSuggestionsTimerRef.current) window.clearTimeout(freshSuggestionsTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!inspectedRelationship) return;
    setInspectorType(inspectedRelationship.type);
    setPreviewDirectionReversed(false);
  }, [inspectedRelationship]);

  useEffect(() => {
    if (!dragState || !panelRef.current) return;
    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const availableWidth = Math.max(360, window.innerWidth - rightInset);
      const maxX = availableWidth / 2 - rect.width / 2 - 18;
      const minX = -maxX;
      const maxY = window.innerHeight / 2 - rect.height / 2 - 18;
      const minY = -maxY;
      setPosition({ x: clamp(event.clientX - dragState.dx, minX, maxX), y: clamp(event.clientY - dragState.dy, minY, maxY) });
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
  }, [dragState, note, onPositionChange, position, rightInset]);

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
    }), [dismissedSuggestionIds, notesById, proactiveSuggestions, suggestionTypeOverrides, workspaces]);

  const suggestionDockIntro = useMemo(() => getSuggestionDockIntro(visibleProactiveSuggestions), [visibleProactiveSuggestions]);
  const suggestionSignature = useMemo(() => visibleProactiveSuggestions.map((suggestion) => suggestion.id).join('|'), [visibleProactiveSuggestions]);
  const sourceNote = note?.taskSource ? notesById.get(note.taskSource.sourceNoteId) ?? null : null;
  const sourceSnippet = useMemo(() => {
    if (!note?.taskSource || !sourceNote) return null;
    const direct = sourceNote.body.slice(note.taskSource.start, note.taskSource.end);
    if (direct === note.taskSource.text) return direct;
    const exactIndex = sourceNote.body.indexOf(note.taskSource.text);
    if (exactIndex !== -1) return sourceNote.body.slice(exactIndex, exactIndex + note.taskSource.text.length);
    return note.taskSource.text;
  }, [note, sourceNote]);

  useEffect(() => {
    if (!visibleProactiveSuggestions.length) {
      setLinkSuggestionsExpanded(false);
      setFreshSuggestionsVisible(false);
      previousSuggestionSignatureRef.current = '';
      if (freshSuggestionsTimerRef.current) {
        window.clearTimeout(freshSuggestionsTimerRef.current);
        freshSuggestionsTimerRef.current = null;
      }
      return;
    }

    if (previousSuggestionSignatureRef.current && previousSuggestionSignatureRef.current !== suggestionSignature) {
      setFreshSuggestionsVisible(true);
      if (freshSuggestionsTimerRef.current) window.clearTimeout(freshSuggestionsTimerRef.current);
      freshSuggestionsTimerRef.current = window.setTimeout(() => {
        setFreshSuggestionsVisible(false);
        freshSuggestionsTimerRef.current = null;
      }, 1800);
    }

    previousSuggestionSignatureRef.current = suggestionSignature;
  }, [suggestionSignature, visibleProactiveSuggestions.length]);

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
  const flowSummary = summarizeConnectionFlows(connectedGroups);
  const constellationIntro = getConstellationIntro(connectedGroups);

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

  const previewSuggestedLink = (targetId: string) => {
    flashInlineTarget(targetId);
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
    setBodyMode('edit');
    window.setTimeout(() => runRefinement(presetId), 0);
  };

  const workspaceSummary = noteWorkspace ? noteWorkspace.name : 'Assign workspace';
  const threadSummary = noteProjects.length
    ? noteProjects.slice(0, 2).map((project) => project.name).join(', ') + (noteProjects.length > 2 ? ` +${noteProjects.length - 2}` : '')
    : 'No shared threads';

  return (
    <section className="expanded-note-shell" style={{ ['--thinking-rail-reserved' as string]: `${rightInset}px` }}>
      <aside ref={panelRef} className="expanded-note" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        <header className="expanded-note-header" onPointerDown={(event: PointerEvent<HTMLElement>) => {
          const target = event.target as HTMLElement;
          if (target.closest('button, input, textarea, select, label')) return;
          event.preventDefault();
          setDragState({ dx: event.clientX - position.x, dy: event.clientY - position.y });
        }}>
          <div className="expanded-note-header-main">
            <input className="note-title-field" aria-label="Note title" placeholder="Untitled note" value={note.title ?? ''} onChange={(event) => onChange(note.id, { title: event.target.value })} />
            <div className="note-header-meta-row">
              <div className="body-mode-switch" role="tablist" aria-label="Note body mode">
                <button role="tab" aria-selected={bodyMode === 'read'} className={bodyMode === 'read' ? 'active' : ''} onClick={() => setBodyMode('read')}>Read</button>
                <button role="tab" aria-selected={bodyMode === 'edit'} className={bodyMode === 'edit' ? 'active' : ''} onClick={() => setBodyMode('edit')}>Edit</button>
              </div>
              <div className="note-project-pills">
                {noteProjects.map((project) => (
                  <button key={project.id} className={`project-pill ${activeProjectRevealId === project.id ? 'active' : ''}`} style={{ ['--project-accent' as string]: project.color }} onClick={() => onSetProjectLens(activeProjectRevealId === project.id ? null : project.id)}>{project.name}</button>
                ))}
                <button
                  type="button"
                  className={`project-pill workspace-pill ${noteWorkspace ? '' : 'workspace-inline-label--empty'} ${activeWorkspaceLensId === noteWorkspace?.id ? 'active' : ''}`.trim()}
                  style={noteWorkspace ? { ['--project-accent' as string]: noteWorkspace.color } : undefined}
                  onClick={() => {
                    setWorkspaceSectionOpen((open) => !open || !noteWorkspace);
                    if (noteWorkspace) onSetWorkspaceLens(activeWorkspaceLensId === noteWorkspace.id ? null : noteWorkspace.id);
                  }}
                >
                  {workspaceSummary}
                </button>
                {note.intent === 'task' ? (
                  <button
                    className={`project-pill project-pill--utility ${note.taskState === 'done' ? 'active' : ''}`}
                    onClick={() => onSetTaskState(note.id, note.taskState === 'done' ? 'open' : 'done')}
                  >
                    {getTaskStateLabel(note.taskState)}
                  </button>
                ) : null}
                <button className={`project-pill project-pill--utility ${isFocus ? 'active' : ''}`} onClick={() => onToggleFocus(note.id)}>{isFocus ? 'Focus' : 'Mark Focus'}</button>
              </div>
            </div>
          </div>
          <div className="note-header-tools">
            <IconToolButton
              label="Think about this note"
              kind="thinking"
              pressed={thinkingActive}
              pulse={hasFreshInsights && !thinkingActive}
              onClick={onThinkAboutNote}
            />
          </div>
        </header>

        <div className="expanded-note-layout">
          <div className="expanded-note-main">
            <div className="note-body-surface" data-mode={bodyMode}>
              {bodyMode === 'read' ? (
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
                  onToggleCheckbox={(lineIndex, checked) => onChange(note.id, { body: toggleMarkdownCheckbox(note.body, lineIndex, checked) })}
                />
              ) : (
                <div className="note-edit-stack">
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
                      setBodyMode('read');
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
                  />
                </div>
              )}
            </div>

            <AttachmentPanel
              attachments={note.attachments ?? []}
              onAddAttachments={onAddAttachments}
              onRemoveAttachment={onRemoveAttachment}
              onRetryAttachment={onRetryAttachment}
            />
            {likelyActionFragments.length ? (
              <section className="capture-followups" aria-label="Likely follow-up suggestions">
                <div className="section-head">
                  <div>
                    <strong>Likely follow-ups</strong>
                    <p className="section-hint">Optional suggestions from this capture only. Nothing becomes a task until you promote it.</p>
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
                        onClick={() => {
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
          </div>

          <aside className="expanded-note-sidebar">
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
            <section ref={constellationSectionRef} className="detail-section detail-section--constellation" aria-label="Constellation">
              <div className="section-head">
                <div>
                  <strong>Constellation</strong>
                  <p className="section-hint section-hint--constellation">{constellationIntro}</p>
                </div>
                <span className="section-meta">{relationships.length} in view</span>
              </div>

              <p className="filter-state-copy">Local map · {flowSummary}</p>


              <div className="connections-flow-list" aria-label="Constellation map">
                {connectedGroups.some((group) => group.items.length) ? connectedGroups.map((group) => (
                  group.items.length ? (
                    <section key={group.key} className="connections-flow-group" aria-label={group.label}>
                      <div className="connections-flow-head">
                        <strong>{group.label}</strong>
                        <span>{group.items.length}</span>
                      </div>

                      <div className="relations-list">
                        {group.items.map((relationship) => (
                          <div
                            key={relationship.id}
                            className={`relation-row relation-row--${relationship.explicitness} relation-row--${group.key} relation-row--${getRelationshipTone(note.id, relationship)}`}
                            onMouseEnter={() => onHoverRelatedNote(relationship.targetId)}
                            onMouseLeave={() => onClearRelatedHover(relationship.targetId)}
                          >
                            <button className="relation-main" onClick={() => onInspectRelationship(relationship.id)}>
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
                            <button className="relation-open" onClick={() => onOpenRelated(relationship.targetId, relationship.id)}>Follow</button>
                            {relationship.explicitness === 'explicit' ? (
                              <button className="ghost-button relation-remove" onClick={() => onRemoveRelationship(relationship.id)}>Remove link</button>
                            ) : null}
                            {relationship.explicitness === 'inferred' && relationship.state === 'proposed' ? <button className="relation-confirm" onClick={() => onConfirmRelationship(relationship.id)}>Keep</button> : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null
                )) : <p className="relations-empty">The local map is still empty.</p>}
              </div>

              {inspectedRelationship && inspectedFrom && inspectedTo ? (
                <section className="relationship-inspector" aria-label="Connection detail">
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
                  </div>
                </section>
              ) : null}
              <section ref={organizationSectionRef} className="detail-section detail-section--constellation-subsection" aria-label="Anchored in">
                <button type="button" className="disclosure-summary" aria-expanded={workspaceSectionOpen} onClick={() => setWorkspaceSectionOpen((open) => !open)}>
                  <span>
                    <strong>Anchored in</strong>
                    <small>{workspaceSummary}</small>
                  </span>
                  <span aria-hidden="true">{workspaceSectionOpen ? '−' : '+'}</span>
                </button>
                {workspaceSectionOpen ? (
                  <>
                    <div className="section-head section-head--icon-action">
                      <div>
                        <small className="section-hint">Give this note a home so nearby paths stay oriented.</small>
                      </div>
                      <IconToolButton
                        label={showWorkspaceComposer ? 'Close place maker' : 'Add a new place'}
                        kind="workspace"
                        pressed={showWorkspaceComposer}
                        onClick={() => setShowWorkspaceComposer((open) => !open)}
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
                        <button onClick={() => { if (!(workspaceDraft.key ?? workspaceDraft.name ?? '').trim()) return; onCreateWorkspace(note.id, workspaceDraft); setWorkspaceDraft(DEFAULT_WORKSPACE_DRAFT); setShowWorkspaceComposer(false); }}>Create place</button>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>

              <section className="detail-section detail-section--constellation-subsection" aria-label="Shared threads">
                <button type="button" className="disclosure-summary" aria-expanded={projectSectionOpen} onClick={() => setProjectSectionOpen((open) => !open)}>
                  <span>
                    <strong>Shared threads</strong>
                    <small>{threadSummary}</small>
                  </span>
                  <span aria-hidden="true">{projectSectionOpen ? '−' : '+'}</span>
                </button>
                {projectSectionOpen ? (
                  <>
                    <div className="section-head section-head--icon-action">
                      <div>
                        <small className="section-hint">Let the note join a few larger storylines when it helps.</small>
                      </div>
                      <IconToolButton
                        label={showProjectComposer ? 'Close thread maker' : 'Add a new thread'}
                        kind="project"
                        pressed={showProjectComposer}
                        onClick={() => setShowProjectComposer((open) => !open)}
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
                        <button onClick={() => { if (!(projectDraft.key ?? projectDraft.name ?? '').trim()) return; onCreateProject(note.id, projectDraft); setProjectDraft(DEFAULT_PROJECT_DRAFT); setShowProjectComposer(false); }}>Create thread</button>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>
            </section>
          </aside>
        </div>
        <footer className="note-footer-toolbar">
          <div className="note-footer-toolbar__primary">
            <button type="button" className="ghost-button" onClick={() => runOutcomeRefinement('clarify')}>Clarify</button>
            <button type="button" className="ghost-button" onClick={() => runOutcomeRefinement('executive_summary')}>Executive Summary</button>
            <button type="button" className="ghost-button" onClick={() => runOutcomeRefinement('summarize')}>Summarize</button>
            <button
              type="button"
              className={`ghost-button ${workspaceSectionOpen || projectSectionOpen ? 'active' : ''}`}
              onClick={() => {
                setWorkspaceSectionOpen(true);
                setProjectSectionOpen(true);
                organizationSectionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }}
            >
              Organize
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => constellationSectionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}
            >
              Relationships
            </button>
          </div>
          <div className="note-footer-toolbar__secondary">
            <button type="button" className={`ghost-button ${bodyMode === 'edit' ? 'active' : ''}`} onClick={() => setBodyMode(bodyMode === 'edit' ? 'read' : 'edit')}>
              {bodyMode === 'edit' ? 'Back to reading' : 'Open editor'}
            </button>
            <button type="button" className="ghost-button" onClick={() => (note.archived ? onRestoreArchive(note.id) : onArchive(note.id))}>
              {note.archived ? 'Restore from archive' : 'Archive'}
            </button>
            <button type="button" className="ghost-button" onClick={onClose}>Close</button>
            <details className="note-danger-menu" open={showDangerActions} onToggle={(event) => setShowDangerActions((event.currentTarget as HTMLDetailsElement).open)}>
              <summary className="ghost-button">More</summary>
              <div className="note-danger-menu__panel">
                <button type="button" className="ghost-button note-danger-action" onClick={() => onDelete(note.id)}>Delete</button>
              </div>
            </details>
          </div>
        </footer>
      </aside>

      {visibleProactiveSuggestions.length ? (
        <aside
          className={`link-suggestions-dock ${linkSuggestionsExpanded ? 'is-expanded' : 'is-collapsed'} ${freshSuggestionsVisible ? 'is-fresh' : ''}`}
          aria-label="Link Suggestions"
        >
          <button
            type="button"
            className="link-suggestions-dock-toggle"
            aria-expanded={linkSuggestionsExpanded}
            onClick={() => setLinkSuggestionsExpanded((current) => !current)}
          >
            <span className="link-suggestions-dock-toggle-label">Link Suggestions · {visibleProactiveSuggestions.length}</span>
            <span className="link-suggestions-dock-toggle-icon" aria-hidden="true">{linkSuggestionsExpanded ? '−' : '+'}</span>
          </button>

          {linkSuggestionsExpanded ? (
            <div className="link-suggestions-dock-panel">
              <div className="link-suggestions-dock-head">
                <div>
                  <strong>Link Suggestions</strong>
                  <p>{suggestionDockIntro}</p>
                </div>
                <span>{visibleProactiveSuggestions.length}</span>
              </div>

              <div className="link-suggestions-dock-list">
                {visibleProactiveSuggestions.slice(0, 5).map((suggestion) => (
                  <article
                    key={suggestion.id}
                    className="link-suggestion-row"
                    onMouseEnter={() => onHoverRelatedNote(suggestion.targetId)}
                    onMouseLeave={() => onClearRelatedHover(suggestion.targetId)}
                  >
                    <div className="link-suggestion-copy">
                      <div className="link-suggestion-heading">
                        <strong>{suggestion.targetTitle}</strong>
                        {suggestion.workspaceLabel ? (
                          <span
                            className="link-suggestion-workspace"
                            style={{ ['--workspace-accent' as string]: suggestion.workspaceColor ?? 'rgba(148, 164, 196, 0.7)' }}
                          >
                            {suggestion.workspaceLabel}
                          </span>
                        ) : null}
                      </div>
                      <p>{suggestion.reason}</p>
                    </div>
                    <div className="link-suggestion-actions">
                      <button type="button" className="link-suggestion-link" onClick={() => acceptSuggestedLink(suggestion)}>Link</button>
                      <button type="button" className="ghost-button link-suggestion-preview" onClick={() => previewSuggestedLink(suggestion.targetId)}>Preview</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
