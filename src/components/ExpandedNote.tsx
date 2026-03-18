import {
  DETAIL_SURFACE_RELATIONSHIP_OPTIONS,
  DetailSurfaceRelationshipOption,
  getDetailSurfaceRelationshipOption
} from '../detailSurface/detailSurfaceModel';
import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MarkdownProjectionView } from './MarkdownProjectionView';
import { toggleMarkdownCheckbox } from '../markdownProjection';
import { getCompactDisplayTitle } from '../noteText';
import { isRelationshipTypeDirectional } from '../relationshipLogic';
import { ProjectDraft } from '../projects/projectModel';
import { WorkspaceDraft } from '../workspaces/workspaceModel';
import { NoteCardModel, Project, Relationship, RelationshipType, Workspace } from '../types';

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
  relationshipTotals: Record<RelationshipType, number>;
  activeFilter: 'all' | RelationshipType;
  activeProjectRevealId: string | null;
  activeWorkspaceLensId: string | null;
  onSetFilter: (filter: 'all' | RelationshipType) => void;
  onClose: () => void;
  onArchive: (id: string) => void;
  onChange: (id: string, updates: Partial<NoteCardModel>) => void;
  onOpenRelated: (targetNoteId: string, relationshipId: string) => void;
  onInspectRelationship: (relationshipId: string) => void;
  onCloseRelationshipInspector: () => void;
  onCreateExplicitLink: (fromId: string, toId: string, type: RelationshipType) => void;
  onConfirmRelationship: (relationshipId: string) => void;
  onUpdateRelationship: (relationshipId: string, type: RelationshipType, fromId: string, toId: string) => void;
  onUndoRelationshipEdit: () => void;
  onToggleFocus: (id: string) => void;
  onSetProjectIds: (id: string, projectIds: string[]) => void;
  onCreateProject: (id: string, draft: ProjectDraft) => void;
  onSetWorkspaceId: (id: string, workspaceId: string | null) => void;
  onCreateWorkspace: (id: string, draft: WorkspaceDraft) => void;
  onSetProjectLens: (projectId: string | null) => void;
  onSetWorkspaceLens: (workspaceId: string | null) => void;
  onHoverRelatedNote: (noteId: string) => void;
  onClearRelatedHover: (noteId: string) => void;
};

type DragState = { dx: number; dy: number };
type BodyMode = 'read' | 'edit';
type SidebarSection = 'connections' | 'organize';

const DEFAULT_PROJECT_DRAFT: ProjectDraft = { key: '', name: '', color: '#7aa2f7', description: '' };
const DEFAULT_WORKSPACE_DRAFT: WorkspaceDraft = { key: '', name: '', color: '#5fbf97', description: '' };
const RELATIONSHIP_FILTER_OPTIONS = [{ type: 'all' as const, label: 'All' }, ...DETAIL_SURFACE_RELATIONSHIP_OPTIONS.map(({ type, label }) => ({ type, label }))];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  if (!visible.length) return 'No visible connected notes yet.';
  return visible.map((group) => `${group.label} ${group.items.length}`).join(' · ');
}

function describeRelationship(relationship: VisibleRelationship) {
  const parts = [formatRelationshipType(relationship.type)];
  if (['depends_on', 'supports', 'leads_to', 'part_of', 'derived_from', 'references'].includes(relationship.type)) parts.push('directional');
  if (['part_of', 'derived_from'].includes(relationship.type)) parts.push('structural');
  parts.push(relationship.explicitness === 'inferred' ? 'inferred' : 'explicit');
  if (relationship.explicitness === 'inferred') parts.push(relationship.state === 'proposed' ? 'awaiting confirmation' : 'confirmed inference');
  return parts.join(' · ');
}

function describeDirection(fromLabel: string, toLabel: string, directional: boolean) {
  return directional ? `${fromLabel} → ${toLabel}` : `${fromLabel} ↔ ${toLabel}`;
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
  relationshipTotals,
  activeFilter,
  activeProjectRevealId,
  activeWorkspaceLensId,
  onSetFilter,
  onClose,
  onArchive,
  onChange,
  onOpenRelated,
  onInspectRelationship,
  onCloseRelationshipInspector,
  onCreateExplicitLink,
  onConfirmRelationship,
  onUpdateRelationship,
  onUndoRelationshipEdit,
  onToggleFocus,
  onSetProjectIds,
  onCreateProject,
  onSetWorkspaceId,
  onCreateWorkspace,
  onSetProjectLens,
  onSetWorkspaceLens,
  onHoverRelatedNote,
  onClearRelatedHover
}: ExpandedNoteProps) {
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkType, setLinkType] = useState<RelationshipType>('related');
  const [showLinkComposer, setShowLinkComposer] = useState(false);
  const [showProjectComposer, setShowProjectComposer] = useState(false);
  const [showWorkspaceComposer, setShowWorkspaceComposer] = useState(false);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(DEFAULT_PROJECT_DRAFT);
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDraft>(DEFAULT_WORKSPACE_DRAFT);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bodyMode, setBodyMode] = useState<BodyMode>('read');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [inspectorType, setInspectorType] = useState<RelationshipType>('related');
  const [previewDirectionReversed, setPreviewDirectionReversed] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState<SidebarSection>('connections');
  const panelRef = useRef<HTMLElement | null>(null);

  const linkableNotes = useMemo(() => (note ? notes.filter((candidate) => candidate.id !== note.id && !candidate.archived) : []), [note, notes]);
  const groupedRelationshipOptions = useMemo(() => {
    return DETAIL_SURFACE_RELATIONSHIP_OPTIONS.reduce<Record<DetailSurfaceRelationshipOption['group'], DetailSurfaceRelationshipOption[]>>((groups, option) => {
      groups[option.group] ??= [];
      groups[option.group].push(option);
      return groups;
    }, { 'Core context': [], 'Operational flow': [], 'Structure': [] });
  }, []);
  const selectedRelationshipOption = getDetailSurfaceRelationshipOption(linkType);

  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setDragState(null);
    setBodyMode(note?.trace === 'captured' ? 'edit' : 'read');
    setShowLinkComposer(false);
    setShowProjectComposer(false);
    setShowWorkspaceComposer(false);
    setProjectDraft(DEFAULT_PROJECT_DRAFT);
    setWorkspaceDraft(DEFAULT_WORKSPACE_DRAFT);
    setLinkTargetId('');
    setActiveSidebarSection('connections');
  }, [note?.id, note?.trace]);

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
      const maxX = window.innerWidth / 2 - rect.width / 2 - 18;
      const minX = -maxX;
      const maxY = window.innerHeight / 2 - rect.height / 2 - 18;
      const minY = -maxY;
      setPosition({ x: clamp(event.clientX - dragState.dx, minX, maxX), y: clamp(event.clientY - dragState.dy, minY, maxY) });
    };
    const onPointerUp = () => setDragState(null);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState]);

  if (!note) return null;
  const noteProjectIds = new Set(note.projectIds);
  const isFocus = Boolean(note.isFocus ?? note.inFocus);
  const notesById = new Map(notes.map((candidate) => [candidate.id, candidate]));
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

  return (
    <section className="expanded-note-shell">
      <aside ref={panelRef} className="expanded-note" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        <header className="expanded-note-header" onPointerDown={(event: PointerEvent<HTMLElement>) => {
          const target = event.target as HTMLElement;
          if (target.closest('button, input, textarea, select, label')) return;
          event.preventDefault();
          setDragState({ dx: event.clientX - position.x, dy: event.clientY - position.y });
        }}>
          <div className="expanded-note-header-main">
            <input className="note-title-field" aria-label="Note title" placeholder="Untitled note" value={note.title ?? ''} onChange={(event) => onChange(note.id, { title: event.target.value })} />
            <div className="body-mode-switch" role="tablist" aria-label="Note body mode">
              <button role="tab" aria-selected={bodyMode === 'read'} className={bodyMode === 'read' ? 'active' : ''} onClick={() => setBodyMode('read')}>Read</button>
              <button role="tab" aria-selected={bodyMode === 'edit'} className={bodyMode === 'edit' ? 'active' : ''} onClick={() => setBodyMode('edit')}>Edit</button>
            </div>
            <div className="note-project-pills">
              {noteProjects.map((project) => (
                <button key={project.id} className={`project-pill ${activeProjectRevealId === project.id ? 'active' : ''}`} style={{ ['--project-accent' as string]: project.color }} onClick={() => onSetProjectLens(activeProjectRevealId === project.id ? null : project.id)}>{project.key}</button>
              ))}
              {noteWorkspace ? (
                <button className={`project-pill workspace-pill ${activeWorkspaceLensId === noteWorkspace.id ? 'active' : ''}`} style={{ ['--project-accent' as string]: noteWorkspace.color }} onClick={() => onSetWorkspaceLens(activeWorkspaceLensId === noteWorkspace.id ? null : noteWorkspace.id)}>{noteWorkspace.key}</button>
              ) : <span className="workspace-inline-label">No workspace</span>}
              <button className={`project-pill project-pill--utility ${isFocus ? 'active' : ''}`} onClick={() => onToggleFocus(note.id)}>{isFocus ? 'Focus' : 'Mark Focus'}</button>
              <button className="project-pill project-pill--utility" onClick={() => onArchive(note.id)}>Archive</button>
            </div>
          </div>
          <button className="ghost-button" onClick={onClose}>Back to canvas</button>
        </header>

        <div className="expanded-note-layout">
          <div className="expanded-note-main">
            <div className="note-body-surface" data-mode={bodyMode}>
              {bodyMode === 'read' ? <MarkdownProjectionView source={note.body} onToggleCheckbox={(lineIndex, checked) => onChange(note.id, { body: toggleMarkdownCheckbox(note.body, lineIndex, checked) })} /> : <textarea className="note-body-field" aria-label="Note body markdown" placeholder="Write freely…" value={note.body} onChange={(event) => onChange(note.id, { body: event.target.value })} />}
            </div>
          </div>

          <aside className="expanded-note-sidebar">
            <nav className="detail-section-tabs" aria-label="Note detail sections">
              <button className={activeSidebarSection === 'connections' ? 'active' : ''} onClick={() => setActiveSidebarSection('connections')}>Connections</button>
              <button className={activeSidebarSection === 'organize' ? 'active' : ''} onClick={() => setActiveSidebarSection('organize')}>Organize</button>
            </nav>

            {activeSidebarSection === 'connections' ? (
            <section className="detail-section detail-section--connections" aria-label="Connections">
              <div className="section-head">
                <strong>Connections</strong>
                <span className="section-meta">{relationships.length} visible</span>
              </div>

              <p className="filter-state-copy">{flowSummary}</p>

              <div className="connections-flow-list" aria-label="Connected notes">
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
                                  {getFlowLabel(note.id, relationship)} · {formatRelationshipType(relationship.type)} · {relationship.explicitness === 'inferred' ? 'Inferred' : 'Explicit'}
                                </small>
                              </div>
                              {relationship.explicitness === 'inferred' ? <p className="relation-explanation">{relationship.explanation}</p> : null}
                            </button>
                            <button className="relation-open" onClick={() => onOpenRelated(relationship.targetId, relationship.id)}>Open</button>
                            {relationship.explicitness === 'inferred' && relationship.state === 'proposed' ? <button className="relation-confirm" onClick={() => onConfirmRelationship(relationship.id)}>Confirm</button> : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null
                )) : <p className="relations-empty">No connected notes in view yet.</p>}
              </div>

              {inspectedRelationship && inspectedFrom && inspectedTo ? (
                <section className="relationship-inspector" aria-label="Relationship inspector">
                  <div className="section-head">
                    <strong>Relationship inspector</strong>
                    <div className="relationship-inspector-actions">
                      {canUndoRelationshipEdit ? <button className="ghost-button" onClick={onUndoRelationshipEdit}>Undo type edit</button> : null}
                      <button className="ghost-button" onClick={onCloseRelationshipInspector}>Close inspector</button>
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
                      <dt>Current type</dt>
                      <dd>{formatRelationshipType(inspectedRelationship.type)}</dd>
                    </div>
                    <div>
                      <dt>Direction</dt>
                      <dd>{describeDirection(getCompactDisplayTitle(inspectedFrom, 18), getCompactDisplayTitle(inspectedTo, 18), inspectedRelationship.directional)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{inspectedRelationship.explicitness === 'explicit' ? 'Explicit relationship' : inspectedRelationship.state === 'confirmed' ? 'Confirmed inferred relationship' : 'Proposed inferred relationship'}</dd>
                    </div>
                  </dl>

                  <label className="relationship-inspector-field">
                    <span>Type</span>
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
                        <strong>Preview</strong>
                        <p>{describeDirection(previewFromLabel, previewToLabel, true)}</p>
                      </div>
                      <button className="ghost-button" onClick={() => setPreviewDirectionReversed((value) => !value)}>Flip direction</button>
                    </div>
                  ) : null}

                  {directionalityChanged ? (
                    <p className="relationship-inspector-note">
                      This change shifts the relationship from {inspectedRelationship.directional ? 'directed' : 'bidirectional'} to {previewDirectional ? 'directed' : 'bidirectional'}.
                      Review the preview before saving so the graph stays understandable.
                    </p>
                  ) : null}

                  {explicitnessWillChange ? (
                    <p className="relationship-inspector-note">
                      Saving keeps the same relationship record and makes it explicit, so the edited type is clearly user-confirmed rather than a lingering inference.
                    </p>
                  ) : (
                    <p className="relationship-inspector-note">
                      Saving updates this relationship in place and refreshes the web immediately without creating a second edge.
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
                      Save relationship
                    </button>
                    <button className="ghost-button" onClick={() => onOpenRelated(inspectedRelationship.toId === note.id ? inspectedRelationship.fromId : inspectedRelationship.toId, inspectedRelationship.id)}>
                      Open connected note
                    </button>
                  </div>
                </section>
              ) : null}

              <div className="link-compose">
                <button className="ghost-button" onClick={() => setShowLinkComposer((open) => !open)}>{showLinkComposer ? 'Close link tools' : 'Link note'}</button>
                {showLinkComposer ? (
                  <div className="link-composer-inline">
                    <div className="link-row">
                      <select value={linkTargetId} onChange={(event) => setLinkTargetId(event.target.value)}>
                        <option value="">Select a note…</option>
                        {linkableNotes.map((candidate) => <option key={candidate.id} value={candidate.id}>{getCompactDisplayTitle(candidate)}</option>)}
                      </select>
                      <select value={linkType} onChange={(event) => setLinkType(event.target.value as RelationshipType)}>
                        {Object.entries(groupedRelationshipOptions).map(([group, options]) => (
                          <optgroup key={group} label={group}>
                            {options.map(({ type, label }) => <option key={type} value={type}>{label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      <button onClick={() => { if (!linkTargetId) return; onCreateExplicitLink(note.id, linkTargetId, linkType); setLinkTargetId(''); setShowLinkComposer(false); }}>Add</button>
                    </div>
                    <p className="link-compose-description">
                      <strong>{selectedRelationshipOption.label}</strong> · {selectedRelationshipOption.description}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
            ) : null}

            {activeSidebarSection === 'organize' ? (
            <>
            <section className="detail-section detail-section--organize" aria-label="Workspace scope">
              <div className="section-head"><strong>Workspace</strong><button className="ghost-button" onClick={() => setShowWorkspaceComposer((open) => !open)}>{showWorkspaceComposer ? 'Close workspace tools' : 'New workspace'}</button></div>
              <div className="organize-choice-list">
                <label className="project-membership-row">
                  <input type="radio" name={`workspace-${note.id}`} checked={!note.workspaceId} onChange={() => onSetWorkspaceId(note.id, null)} />
                  <span><strong>No workspace</strong><small>Keep this note in the shared surface.</small></span>
                </label>
                {workspaces.map((workspace) => (
                  <label key={workspace.id} className="project-membership-row" style={{ ['--project-accent' as string]: workspace.color }}>
                    <input type="radio" name={`workspace-${note.id}`} checked={note.workspaceId === workspace.id} onChange={() => onSetWorkspaceId(note.id, workspace.id)} />
                    <span><strong>{workspace.key}</strong><small>{workspace.name}</small></span>
                  </label>
                ))}
              </div>
              {showWorkspaceComposer ? (
                <div className="project-compose-inline">
                  <div className="project-compose-grid">
                    <input aria-label="Workspace key" placeholder="Key (OPS)" value={workspaceDraft.key ?? ''} onChange={(event) => setWorkspaceDraft((prev) => ({ ...prev, key: event.target.value }))} />
                    <input aria-label="Workspace name" placeholder="Workspace name" value={workspaceDraft.name ?? ''} onChange={(event) => setWorkspaceDraft((prev) => ({ ...prev, name: event.target.value }))} />
                    <input aria-label="Workspace color" type="color" value={workspaceDraft.color ?? '#5fbf97'} onChange={(event) => setWorkspaceDraft((prev) => ({ ...prev, color: event.target.value }))} />
                  </div>
                  <textarea aria-label="Workspace description" placeholder="What perspective does this workspace hold?" value={workspaceDraft.description ?? ''} onChange={(event) => setWorkspaceDraft((prev) => ({ ...prev, description: event.target.value }))} />
                  <button onClick={() => { if (!(workspaceDraft.key ?? workspaceDraft.name ?? '').trim()) return; onCreateWorkspace(note.id, workspaceDraft); setWorkspaceDraft(DEFAULT_WORKSPACE_DRAFT); setShowWorkspaceComposer(false); }}>Create and anchor</button>
                </div>
              ) : null}
            </section>

            <section className="detail-section detail-section--organize" aria-label="Project membership">
              <div className="section-head"><strong>Projects</strong><button className="ghost-button" onClick={() => setShowProjectComposer((open) => !open)}>{showProjectComposer ? 'Close project tools' : 'New project'}</button></div>
              {projects.length ? (
                <div className="organize-choice-list">
                  {projects.map((project) => (
                    <label key={project.id} className="project-membership-row" style={{ ['--project-accent' as string]: project.color }}>
                      <input type="checkbox" checked={noteProjectIds.has(project.id)} onChange={(event) => {
                        const next = event.target.checked ? [...note.projectIds, project.id] : note.projectIds.filter((projectId) => projectId !== project.id);
                        onSetProjectIds(note.id, next);
                      }} />
                      <span><strong>{project.key}</strong><small>{project.name}</small></span>
                    </label>
                  ))}
                </div>
              ) : <p className="relations-empty">No projects yet. Create one to give this note a shared middle layer.</p>}
              {showProjectComposer ? (
                <div className="project-compose-inline">
                  <div className="project-compose-grid">
                    <input aria-label="Project key" placeholder="Key (SLD)" value={projectDraft.key ?? ''} onChange={(event) => setProjectDraft((prev) => ({ ...prev, key: event.target.value }))} />
                    <input aria-label="Project name" placeholder="Project name" value={projectDraft.name ?? ''} onChange={(event) => setProjectDraft((prev) => ({ ...prev, name: event.target.value }))} />
                    <input aria-label="Project color" type="color" value={projectDraft.color ?? '#7aa2f7'} onChange={(event) => setProjectDraft((prev) => ({ ...prev, color: event.target.value }))} />
                  </div>
                  <textarea aria-label="Project description" placeholder="Why these notes belong together…" value={projectDraft.description ?? ''} onChange={(event) => setProjectDraft((prev) => ({ ...prev, description: event.target.value }))} />
                  <button onClick={() => { if (!(projectDraft.key ?? projectDraft.name ?? '').trim()) return; onCreateProject(note.id, projectDraft); setProjectDraft(DEFAULT_PROJECT_DRAFT); setShowProjectComposer(false); }}>Create and attach</button>
                </div>
              ) : null}
            </section>
            </>
            ) : null}
          </aside>
        </div>
      </aside>
    </section>
  );
}
