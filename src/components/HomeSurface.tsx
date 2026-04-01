import { useMemo, useState } from 'react';
import { getCompactDisplayTitle, getRecapPreview, getSummaryPreview, getUnresolvedPreview } from '../noteText';
import { Lens, NoteCardModel, Project, Workspace } from '../types';
import { FocusSuggestion } from '../scene/focusSuggestions';
import { getWorkspaceIdsForNote } from '../workspaces/workspaceSelectors';

type HomeSurfaceProps = {
  notes: NoteCardModel[];
  workspaces: Workspace[];
  projects: Project[];
  lens: Lens;
  focusSuggestions: FocusSuggestion[];
  onOpenNote: (noteId: string) => void;
  onSetLens: (lens: Lens) => void;
};

type WorkspaceCluster = {
  workspace: Workspace;
  notes: NoteCardModel[];
  suggestedCount: number;
};

type WorkspaceCategoryKey = 'chats' | 'notes' | 'references';

type WorkspaceCategoryLane = {
  key: WorkspaceCategoryKey;
  label: string;
  notes: NoteCardModel[];
};

function rankNotes(notes: NoteCardModel[]) {
  return [...notes].sort((a, b) => {
    const aPriority = (a.isFocus || a.inFocus ? 30 : 0) + (a.intent === 'task' && a.taskState !== 'done' ? 20 : 0) + a.updatedAt / 1_000_000_000;
    const bPriority = (b.isFocus || b.inFocus ? 30 : 0) + (b.intent === 'task' && b.taskState !== 'done' ? 20 : 0) + b.updatedAt / 1_000_000_000;
    return bPriority - aPriority;
  });
}

function buildWorkspaceClusters(notes: NoteCardModel[], workspaces: Workspace[]): WorkspaceCluster[] {
  return workspaces
    .map((workspace) => {
      const inWorkspace = notes.filter((note) => getWorkspaceIdsForNote(note).includes(workspace.id));
      const suggestedCount = notes.filter((note) => (note.inferredWorkspaceIds ?? []).includes(workspace.id) && !getWorkspaceIdsForNote(note).includes(workspace.id)).length;
      return { workspace, notes: rankNotes(inWorkspace), suggestedCount };
    })
    .filter((cluster) => cluster.notes.length > 0 || cluster.suggestedCount > 0)
    .sort((a, b) => b.notes.length - a.notes.length || a.workspace.name.localeCompare(b.workspace.name));
}

function classifyWorkspaceCategory(note: NoteCardModel): WorkspaceCategoryKey {
  const title = note.title ?? '';
  const text = `${title}\n${note.body}`.toLowerCase();
  if (note.attachments?.length || note.provenance?.externalReferences?.length || note.intent === 'link') {
    return 'references';
  }
  if (/(chat|conversation|thread|meeting|call|standup|interview)/i.test(text)) {
    return 'chats';
  }
  return 'notes';
}

function buildWorkspaceCategoryLanes(notes: NoteCardModel[]): WorkspaceCategoryLane[] {
  const order: WorkspaceCategoryKey[] = ['chats', 'notes', 'references'];
  const labels: Record<WorkspaceCategoryKey, string> = {
    chats: 'Chats',
    notes: 'Notes',
    references: 'References'
  };

  return order.map((key) => ({
    key,
    label: labels[key],
    notes: rankNotes(notes.filter((note) => classifyWorkspaceCategory(note) === key)).slice(0, 4)
  }));
}

function getTooltipSummary(note: NoteCardModel, workspaces: Workspace[], projects: Project[]) {
  const workspaceNames = getWorkspaceIdsForNote(note)
    .map((workspaceId) => workspaces.find((workspace) => workspace.id === workspaceId)?.name)
    .filter(Boolean);
  const projectNames = note.projectIds
    .map((projectId) => projects.find((project) => project.id === projectId)?.name)
    .filter(Boolean);
  const suggestionNames = (note.inferredWorkspaceIds ?? [])
    .filter((workspaceId) => !getWorkspaceIdsForNote(note).includes(workspaceId))
    .map((workspaceId) => workspaces.find((workspace) => workspace.id === workspaceId)?.name)
    .filter(Boolean);

  return [
    getRecapPreview(note, 180) || getUnresolvedPreview(note, 180) || getSummaryPreview(note, 180),
    workspaceNames.length ? `Workspaces: ${workspaceNames.join(', ')}` : null,
    projectNames.length ? `Projects: ${projectNames.join(', ')}` : null,
    suggestionNames.length ? `Suggested place: ${suggestionNames.join(', ')}` : null
  ]
    .filter(Boolean)
    .join('\n');
}

export function HomeSurface({ notes, workspaces, projects, lens, focusSuggestions, onOpenNote, onSetLens }: HomeSurfaceProps) {
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const activeNotes = useMemo(() => notes.filter((note) => !note.archived && !note.deleted), [notes]);
  const workspaceClusters = useMemo(() => buildWorkspaceClusters(activeNotes, workspaces), [activeNotes, workspaces]);
  const activeWorkspaceId = lens.kind === 'workspace' ? lens.workspaceId : null;
  const activeCluster = activeWorkspaceId ? workspaceClusters.find((cluster) => cluster.workspace.id === activeWorkspaceId) ?? null : null;
  const visibleClusters = activeCluster
    ? [activeCluster, ...workspaceClusters.filter((cluster) => cluster.workspace.id !== activeWorkspaceId)]
    : workspaceClusters;
  const focusNotes = rankNotes(activeNotes.filter((note) => Boolean(note.isFocus ?? note.inFocus))).slice(0, 4);
  const featuredNotes = activeCluster?.notes ?? rankNotes(activeNotes).slice(0, 8);
  const activeCategoryLanes = useMemo(
    () => activeCluster ? buildWorkspaceCategoryLanes(activeCluster.notes) : [],
    [activeCluster]
  );
  const activeCategorySummary = activeCategoryLanes.filter((lane) => lane.notes.length > 0);
  const hoveredNote = hoveredNoteId ? notes.find((note) => note.id === hoveredNoteId) ?? null : null;

  return (
    <section className="home-bento" aria-label="Workspace field">
      <div className="home-bento__workspace-grid" data-workspace-active={activeCluster ? 'true' : 'false'}>
        {visibleClusters.map((cluster, index) => (
          <button
            key={cluster.workspace.id}
            type="button"
            className={`workspace-cluster ${activeWorkspaceId === cluster.workspace.id ? 'workspace-cluster--active' : activeWorkspaceId ? 'workspace-cluster--faded' : ''}`}
            style={{ ['--cluster-color' as string]: cluster.workspace.color, ['--cluster-order' as string]: String(index) }}
            onClick={() => onSetLens({ kind: 'workspace', workspaceId: cluster.workspace.id, mode: 'context' })}
          >
            <div className="workspace-cluster__head">
              <strong>{cluster.workspace.name}</strong>
              <span>{cluster.notes.length} items</span>
            </div>
            <p>{cluster.workspace.description || 'A calm lens for related material.'}</p>
            <div className="workspace-cluster__chips">
              {cluster.notes.slice(0, 2).map((note) => (
                <span key={note.id}>{getCompactDisplayTitle(note, 30)}</span>
              ))}
              {cluster.suggestedCount > 0 ? <span className="workspace-cluster__suggested">{cluster.suggestedCount} suggested</span> : null}
            </div>
          </button>
        ))}
      </div>

      <div className="home-bento__field">
        <section className="home-bento__lane" aria-label={activeCluster ? `${activeCluster.workspace.name} lens` : 'Inbox workspace lens'}>
          <div className="home-bento__lane-head">
            <div>
              <strong>{activeCluster ? `${activeCluster.workspace.name} lens` : 'Default workspace lens'}</strong>
              <p>{activeCluster ? 'Selecting a workspace turns it into a lens. Recent material rises first; categories stay close at hand.' : 'Choose a workspace constellation or stay in the shared field.'}</p>
            </div>
            {activeCategorySummary.length ? (
              <div className="home-bento__lane-metrics" aria-label="Workspace category counts">
                {activeCategorySummary.map((lane) => <span key={lane.key}>{lane.label} {lane.notes.length}</span>)}
              </div>
            ) : null}
          </div>
          {activeCluster ? (
            <div className="home-bento__category-grid" aria-label={`${activeCluster.workspace.name} categories`}>
              {activeCategoryLanes.map((lane) => (
                <section key={lane.key} className="home-bento__category-card">
                  <div className="home-bento__category-head">
                    <strong>{lane.label}</strong>
                    <span>{lane.notes.length}</span>
                  </div>
                  <div className="home-bento__mini-list">
                    {lane.notes.length ? lane.notes.map((note) => (
                      <button key={note.id} type="button" onClick={() => onOpenNote(note.id)}>
                        <strong>{getCompactDisplayTitle(note, 36)}</strong>
                        <span>{getSummaryPreview(note, 64)}</span>
                      </button>
                    )) : <p>No {lane.label.toLowerCase()} yet.</p>}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
          <div className="home-bento__atoms">
            {featuredNotes.map((note, index) => {
              const primaryWorkspaceId = getWorkspaceIdsForNote(note)[0] ?? null;
              const primaryWorkspace = primaryWorkspaceId ? workspaces.find((workspace) => workspace.id === primaryWorkspaceId) ?? null : null;
              const suggestedWorkspaceId = (note.inferredWorkspaceIds ?? []).find((workspaceId) => !getWorkspaceIdsForNote(note).includes(workspaceId)) ?? null;
              const suggestedWorkspace = suggestedWorkspaceId ? workspaces.find((workspace) => workspace.id === suggestedWorkspaceId) ?? null : null;
              return (
                <button
                  key={note.id}
                  type="button"
                  className={`bento-atom bento-atom--${index === 0 ? 'wide' : index % 4 === 0 ? 'large' : 'standard'}`}
                  style={{ ['--atom-color' as string]: primaryWorkspace?.color ?? suggestedWorkspace?.color ?? '#d8c9a5' }}
                  onClick={() => onOpenNote(note.id)}
                  onMouseEnter={() => setHoveredNoteId(note.id)}
                  onMouseLeave={() => setHoveredNoteId((current) => (current === note.id ? null : current))}
                >
                  <div className="bento-atom__meta">
                    {primaryWorkspace ? <span>{primaryWorkspace.name}</span> : null}
                    {suggestedWorkspace ? <span className="is-suggested">{suggestedWorkspace.name}</span> : null}
                  </div>
                  <strong>{getCompactDisplayTitle(note, 54)}</strong>
                  <p>{getSummaryPreview(note, 110)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="home-bento__sidebar" aria-label="Pinned and focus">
          <section className="home-bento__stack">
            <div className="home-bento__stack-head">
              <strong>Pinned</strong>
              <span>{focusNotes.length}</span>
            </div>
            <div className="home-bento__mini-list">
              {focusNotes.length ? focusNotes.map((note) => (
                <button key={note.id} type="button" onClick={() => onOpenNote(note.id)}>
                  <strong>{getCompactDisplayTitle(note, 34)}</strong>
                  <span>{getSummaryPreview(note, 72)}</span>
                </button>
              )) : <p>Nothing is pinned yet.</p>}
            </div>
          </section>

          <section className="home-bento__stack">
            <div className="home-bento__stack-head">
              <strong>Focus</strong>
              <span>{focusNotes.length ? 'confirmed' : 'AI suggestions'}</span>
            </div>
            <div className="home-bento__mini-list">
              {(focusNotes.length ? [] : focusSuggestions).map((candidate) => (
                <button key={candidate.noteId} type="button" className="is-suggested" onClick={() => onOpenNote(candidate.noteId)}>
                  <strong>{candidate.label}</strong>
                  <span>{candidate.reason} · {Math.round(candidate.confidence * 100)}%</span>
                </button>
              ))}
              {focusNotes.length ? null : !focusSuggestions.length ? <p>No strong candidates yet.</p> : null}
            </div>
          </section>
        </aside>
      </div>

      {hoveredNote ? (
        <aside className="home-bento__tooltip" role="status" aria-live="polite">
          <strong>{getCompactDisplayTitle(hoveredNote, 60)}</strong>
          <p>{getTooltipSummary(hoveredNote, workspaces, projects)}</p>
        </aside>
      ) : null}
    </section>
  );
}
