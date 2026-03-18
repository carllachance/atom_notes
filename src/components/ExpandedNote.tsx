import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MarkdownProjectionView } from './MarkdownProjectionView';
import { getCompactDisplayTitle } from '../noteText';
import { ProjectDraft } from '../projects/projectModel';
import { WorkspaceDraft } from '../workspaces/workspaceModel';
import { NoteCardModel, Project, RelationshipType, Workspace } from '../types';

type VisibleRelationship = {
  id: string;
  targetId: string;
  targetTitle: string;
  type: RelationshipType;
  explicitness: 'explicit' | 'inferred';
  state: 'proposed' | 'confirmed';
  explanation: string;
  heuristicSupported: boolean;
};

type ExpandedNoteProps = {
  note: NoteCardModel | null;
  notes: NoteCardModel[];
  projects: Project[];
  workspaces: Workspace[];
  noteProjects: Project[];
  noteWorkspace: Workspace | null;
  relationships: VisibleRelationship[];
  relationshipTotals: Record<RelationshipType, number>;
  activeFilter: 'all' | RelationshipType;
  activeProjectRevealId: string | null;
  activeWorkspaceLensId: string | null;
  onSetFilter: (filter: 'all' | RelationshipType) => void;
  onClose: () => void;
  onArchive: (id: string) => void;
  onChange: (id: string, updates: Partial<NoteCardModel>) => void;
  onOpenRelated: (targetNoteId: string, relationshipId: string) => void;
  onCreateExplicitLink: (fromId: string, toId: string, type: RelationshipType) => void;
  onConfirmRelationship: (relationshipId: string) => void;
  onToggleFocus: (id: string) => void;
  onSetProjectIds: (id: string, projectIds: string[]) => void;
  onCreateProject: (id: string, draft: ProjectDraft) => void;
  onSetWorkspaceId: (id: string, workspaceId: string | null) => void;
  onCreateWorkspace: (id: string, draft: WorkspaceDraft) => void;
  onSetProjectLens: (projectId: string | null) => void;
  onSetWorkspaceLens: (workspaceId: string | null) => void;
};

type DragState = { dx: number; dy: number };
type BodyMode = 'read' | 'edit';

type RelationshipOption = {
  type: RelationshipType;
  label: string;
  group: 'Core context' | 'Operational flow' | 'Structure';
  description: string;
};

const DEFAULT_PROJECT_DRAFT: ProjectDraft = { key: '', name: '', color: '#7aa2f7', description: '' };
const DEFAULT_WORKSPACE_DRAFT: WorkspaceDraft = { key: '', name: '', color: '#5fbf97', description: '' };
const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  { type: 'related', label: 'Related', group: 'Core context', description: 'Shared concept or nearby idea.' },
  { type: 'references', label: 'References', group: 'Core context', description: 'Source, citation, or supporting artifact.' },
  { type: 'depends_on', label: 'Depends on', group: 'Operational flow', description: 'This note needs the other note first.' },
  { type: 'supports', label: 'Supports', group: 'Operational flow', description: 'Reinforces or enables the other note.' },
  { type: 'contradicts', label: 'Contradicts', group: 'Operational flow', description: 'Signals conflict or inconsistency.' },
  { type: 'leads_to', label: 'Leads to', group: 'Operational flow', description: 'Points toward the next likely result.' },
  { type: 'part_of', label: 'Part of', group: 'Structure', description: 'Places this note inside a larger structure.' },
  { type: 'derived_from', label: 'Derived from', group: 'Structure', description: 'Captures provenance or lineage.' }
];

const RELATIONSHIP_FILTER_OPTIONS = [{ type: 'all' as const, label: 'All' }, ...RELATIONSHIP_OPTIONS.map(({ type, label }) => ({ type, label }))];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatRelationshipType(type: RelationshipType) {
  return RELATIONSHIP_OPTIONS.find((option) => option.type === type)?.label ?? type.replace(/_/g, ' ');
}

function describeFilterState(activeFilter: 'all' | RelationshipType, relationshipTotals: Record<RelationshipType, number>, relationshipsLength: number) {
  if (activeFilter === 'all') {
    return `Showing all visible relationships (${relationshipsLength}). Hover a type to preview that local slice, or click to keep it active.`;
  }

  const count = relationshipTotals[activeFilter] ?? 0;
  return `${formatRelationshipType(activeFilter)} is pinned (${count}). The background web and the modal list now stay aligned to that one explainable connection type.`;
}

function describeRelationship(relationship: VisibleRelationship) {
  const parts = [formatRelationshipType(relationship.type)];
  if (['depends_on', 'supports', 'leads_to', 'part_of', 'derived_from', 'references'].includes(relationship.type)) parts.push('directional');
  if (['part_of', 'derived_from'].includes(relationship.type)) parts.push('structural');
  parts.push(relationship.explicitness === 'inferred' ? 'inferred' : 'explicit');
  if (relationship.explicitness === 'inferred') parts.push(relationship.state === 'proposed' ? 'awaiting confirmation' : 'confirmed inference');
  return parts.join(' · ');
}

export function ExpandedNote({
  note,
  notes,
  projects,
  workspaces,
  noteProjects,
  noteWorkspace,
  relationships,
  relationshipTotals,
  activeFilter,
  activeProjectRevealId,
  activeWorkspaceLensId,
  onSetFilter,
  onClose,
  onArchive,
  onChange,
  onOpenRelated,
  onCreateExplicitLink,
  onConfirmRelationship,
  onToggleFocus,
  onSetProjectIds,
  onCreateProject,
  onSetWorkspaceId,
  onCreateWorkspace,
  onSetProjectLens,
  onSetWorkspaceLens
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
  const panelRef = useRef<HTMLElement | null>(null);

  const linkableNotes = useMemo(() => (note ? notes.filter((candidate) => candidate.id !== note.id && !candidate.archived) : []), [note, notes]);
  const groupedRelationshipOptions = useMemo(() => {
    return RELATIONSHIP_OPTIONS.reduce<Record<RelationshipOption['group'], RelationshipOption[]>>((groups, option) => {
      groups[option.group] ??= [];
      groups[option.group].push(option);
      return groups;
    }, { 'Core context': [], 'Operational flow': [], 'Structure': [] });
  }, []);
  const selectedRelationshipOption = RELATIONSHIP_OPTIONS.find((option) => option.type === linkType) ?? RELATIONSHIP_OPTIONS[0];

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
  }, [note?.id, note?.trace]);

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
  const filterState = describeFilterState(activeFilter, relationshipTotals, relationships.length);

  return (
    <section className="expanded-note-shell">
      <aside ref={panelRef} className="expanded-note" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        <header className="expanded-note-header" onPointerDown={(event: PointerEvent<HTMLElement>) => {
          const target = event.target as HTMLElement;
          if (target.closest('button')) return;
          event.preventDefault();
          setDragState({ dx: event.clientX - position.x, dy: event.clientY - position.y });
        }}>
          <div>
            <strong title={getCompactDisplayTitle(note, 72)}>{getCompactDisplayTitle(note, 56)}</strong>
            <div className="note-project-pills">
              {noteProjects.map((project) => (
                <button key={project.id} className={`project-pill ${activeProjectRevealId === project.id ? 'active' : ''}`} style={{ ['--project-accent' as string]: project.color }} onClick={() => onSetProjectLens(activeProjectRevealId === project.id ? null : project.id)}>{project.key}</button>
              ))}
              {noteWorkspace ? (
                <button className={`project-pill workspace-pill ${activeWorkspaceLensId === noteWorkspace.id ? 'active' : ''}`} style={{ ['--project-accent' as string]: noteWorkspace.color }} onClick={() => onSetWorkspaceLens(activeWorkspaceLensId === noteWorkspace.id ? null : noteWorkspace.id)}>{noteWorkspace.key}</button>
              ) : <span className="workspace-inline-label">No workspace</span>}
              {isFocus ? <span className="focus-badge focus-badge--persistent">Focus</span> : null}
            </div>
          </div>
          <button className="ghost-button" onClick={onClose}>Back to canvas</button>
        </header>

        <div className="relationship-strip relationship-strip-grid">
          {RELATIONSHIP_FILTER_OPTIONS.map(({ type, label }) => (
            <button
              key={type}
              className={activeFilter === type ? 'active' : ''}
              onMouseEnter={() => onSetFilter(type)}
              onMouseLeave={() => onSetFilter(activeFilter)}
              onClick={() => onSetFilter(activeFilter === type ? 'all' : type)}
            >
              {label} <span>{type === 'all' ? relationships.length : relationshipTotals[type] ?? 0}</span>
            </button>
          ))}
        </div>

        <p className="filter-state-copy">{filterState}</p>

        <input aria-label="Note title" value={note.title ?? ''} onChange={(event) => onChange(note.id, { title: event.target.value })} />

        <div className="body-mode-switch" role="tablist" aria-label="Note body mode">
          <button role="tab" aria-selected={bodyMode === 'read'} className={bodyMode === 'read' ? 'active' : ''} onClick={() => setBodyMode('read')}>Read</button>
          <button role="tab" aria-selected={bodyMode === 'edit'} className={bodyMode === 'edit' ? 'active' : ''} onClick={() => setBodyMode('edit')}>Edit</button>
        </div>

        {bodyMode === 'read' ? <MarkdownProjectionView source={note.body} /> : <textarea aria-label="Note body markdown" value={note.body} onChange={(event) => onChange(note.id, { body: event.target.value })} />}

        <section className="project-membership" aria-label="Workspace scope">
          <div className="section-head"><strong>Workspace</strong><button className="ghost-button" onClick={() => setShowWorkspaceComposer((open) => !open)}>{showWorkspaceComposer ? 'Close workspace tools' : 'New workspace'}</button></div>
          <select value={note.workspaceId ?? ''} onChange={(event) => onSetWorkspaceId(note.id, event.target.value || null)}>
            <option value="">No workspace affinity</option>
            {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.key} · {workspace.name}</option>)}
          </select>
          {showWorkspaceComposer ? (
            <div className="project-compose-card">
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

        <section className="project-membership" aria-label="Project membership">
          <div className="section-head"><strong>Projects</strong><button className="ghost-button" onClick={() => setShowProjectComposer((open) => !open)}>{showProjectComposer ? 'Close project tools' : 'New project'}</button></div>
          {projects.length ? (
            <div className="project-membership-grid">
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
            <div className="project-compose-card">
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

        <section className="relations-list" aria-label="Relations">
          {relationships.length ? relationships.map((relationship) => (
            <div key={relationship.id} className={`relation-row relation-row--${relationship.explicitness} relation-row--${relationship.type}`}>
              <button className="relation-main" onClick={() => onOpenRelated(relationship.targetId, relationship.id)}>
                <span className="relation-title">{relationship.targetTitle}</span>
                <small>{describeRelationship(relationship)}</small>
                <p className="relation-explanation">{relationship.explicitness === 'inferred' ? relationship.explanation : 'Explicit link created in the modal.'}</p>
              </button>
              {relationship.explicitness === 'inferred' && relationship.state === 'proposed' ? <button className="relation-confirm" onClick={() => onConfirmRelationship(relationship.id)}>Confirm</button> : null}
            </div>
          )) : <p className="relations-empty">No relationships yet.</p>}
        </section>

        <div className="link-compose">
          <button className="ghost-button" onClick={() => setShowLinkComposer((open) => !open)}>{showLinkComposer ? 'Close link tools' : 'Link note'}</button>
          {showLinkComposer ? (
            <div className="link-composer-card">
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
              <div className="link-compose-groups" aria-label="Relationship type guide">
                {Object.entries(groupedRelationshipOptions).map(([group, options]) => (
                  <section key={group} className="link-compose-group">
                    <strong>{group}</strong>
                    <ul>
                      {options.map((option) => (
                        <li key={option.type}>
                          <span>{option.label}</span>
                          <small>{option.description}</small>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="expanded-actions">
          <button className="ghost-button" onClick={() => onToggleFocus(note.id)}>{isFocus ? 'Remove Focus' : 'Mark Focus'}</button>
          <button className="ghost-button" onClick={() => onArchive(note.id)}>Archive</button>
        </div>
      </aside>
    </section>
  );
}
