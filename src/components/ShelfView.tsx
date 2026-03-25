import { useMemo, useState } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { NoteCardModel, Project, Relationship, Workspace } from '../types';

type GroupMode = 'recent' | 'focus' | 'waiting' | 'project' | 'type' | 'created' | 'edited' | 'pinned';
type StateFilter = 'all' | 'active' | 'waiting' | 'done';

type ShelfViewProps = {
  notes: NoteCardModel[];
  relationships: Relationship[];
  projects: Project[];
  workspaces: Workspace[];
  onOpenNote: (noteId: string) => void;
};

type ShelfItem = {
  note: NoteCardModel;
  relationCount: number;
  projectLabel: string | null;
  workspaceLabel: string | null;
  stateLabel: string;
  tone: 'paper' | 'panel';
};

function formatRecency(updatedAt: number): string {
  const elapsedMs = Date.now() - updatedAt;
  const mins = Math.floor(elapsedMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(elapsedMs / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(elapsedMs / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return new Date(updatedAt).toLocaleDateString();
}

function deriveStateLabel(note: NoteCardModel): string {
  if (note.archived) return 'Archived';
  if (note.intent === 'task' && note.taskState === 'done') return 'Done';
  if (note.intent === 'task') return 'Waiting';
  if (note.inFocus || note.isFocus) return 'In focus';
  return 'Active';
}

function matchesStateFilter(note: NoteCardModel, filter: StateFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'done') return note.intent === 'task' && note.taskState === 'done';
  if (filter === 'waiting') return note.intent === 'task' && note.taskState !== 'done';
  return !note.archived && !(note.intent === 'task' && note.taskState === 'done');
}

function toShelfItems(
  notes: NoteCardModel[],
  relationships: Relationship[],
  projects: Project[],
  workspaces: Workspace[]
): ShelfItem[] {
  const relationCountById = relationships.reduce<Map<string, number>>((acc, relationship) => {
    acc.set(relationship.fromId, (acc.get(relationship.fromId) ?? 0) + 1);
    acc.set(relationship.toId, (acc.get(relationship.toId) ?? 0) + 1);
    return acc;
  }, new Map());
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const workspacesById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  return notes
    .filter((note) => !note.deleted && !note.archived)
    .map((note) => {
      const primaryProject = note.projectIds[0] ? projectsById.get(note.projectIds[0]) ?? null : null;
      const workspace = note.workspaceId ? workspacesById.get(note.workspaceId) ?? null : null;
      return {
        note,
        relationCount: relationCountById.get(note.id) ?? 0,
        projectLabel: primaryProject ? `${primaryProject.key} · ${primaryProject.name}` : null,
        workspaceLabel: workspace ? workspace.name : null,
        stateLabel: deriveStateLabel(note),
        tone: note.inFocus || note.isFocus ? 'paper' : 'panel'
      };
    });
}

export function ShelfView({ notes, relationships, projects, workspaces, onOpenNote }: ShelfViewProps) {
  const [groupBy, setGroupBy] = useState<GroupMode>('recent');
  const [focusOnly, setFocusOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState('all');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  const items = useMemo(
    () => toShelfItems(notes, relationships, projects, workspaces),
    [notes, relationships, projects, workspaces]
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (focusOnly && !(item.note.inFocus || item.note.isFocus)) return false;
      if (projectFilter !== 'all' && !item.note.projectIds.includes(projectFilter)) return false;
      if (workspaceFilter !== 'all' && item.note.workspaceId !== workspaceFilter) return false;
      return matchesStateFilter(item.note, stateFilter);
    });
  }, [focusOnly, items, projectFilter, stateFilter, workspaceFilter]);

  const groups = useMemo(() => {
    const byUpdated = [...filtered].sort((a, b) => b.note.updatedAt - a.note.updatedAt);
    if (groupBy === 'recent' || groupBy === 'edited') return [{ id: 'recent', label: 'Recently active', items: byUpdated }];
    if (groupBy === 'created') return [{ id: 'created', label: 'Recently created', items: [...filtered].sort((a, b) => b.note.createdAt - a.note.createdAt) }];
    if (groupBy === 'focus') return [{ id: 'focus', label: 'In focus', items: byUpdated.filter((item) => item.note.inFocus || item.note.isFocus) }];
    if (groupBy === 'waiting') return [{ id: 'waiting', label: 'Waiting', items: byUpdated.filter((item) => item.note.intent === 'task' && item.note.taskState !== 'done') }];
    if (groupBy === 'pinned') return [{ id: 'pinned', label: 'Pinned', items: byUpdated.filter((item) => item.note.inFocus || item.note.isFocus) }];
    if (groupBy === 'project') {
      const grouped = new Map<string, ShelfItem[]>();
      byUpdated.forEach((item) => {
        const key = item.projectLabel ?? 'No project';
        grouped.set(key, [...(grouped.get(key) ?? []), item]);
      });
      return [...grouped.entries()].map(([label, groupedItems]) => ({ id: label, label, items: groupedItems }));
    }
    const grouped = new Map<string, ShelfItem[]>();
    byUpdated.forEach((item) => {
      const key = item.note.intent === 'task'
        ? 'Tasks'
        : item.note.intent === 'code'
          ? 'Code notes'
          : item.note.intent === 'link'
            ? 'References'
            : 'General notes';
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });
    return [...grouped.entries()].map(([label, groupedItems]) => ({ id: label, label, items: groupedItems }));
  }, [filtered, groupBy]);

  const isEmpty = groups.every((group) => group.items.length === 0);

  return (
    <section className="shelf-view" aria-label="Shelf">
      <header className="shelf-toolbar">
        <div>
          <h1>Shelf</h1>
          <p>Calm browsing for living notes. Scan quickly, then reopen with confidence.</p>
        </div>
        <div className="shelf-toolbar__controls">
          <label>
            Group
            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupMode)}>
              <option value="recent">Recently active</option>
              <option value="focus">In focus</option>
              <option value="waiting">Waiting</option>
              <option value="project">By project</option>
              <option value="type">By type</option>
              <option value="created">Recently created</option>
              <option value="edited">Recently edited</option>
              <option value="pinned">Pinned</option>
            </select>
          </label>
          <label>
            Project
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="all">All projects</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.name}</option>)}
            </select>
          </label>
          <label>
            Workspace
            <select value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value)}>
              <option value="all">All workspaces</option>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
          </label>
          <label>
            State
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as StateFilter)}>
              <option value="all">All states</option>
              <option value="active">Active</option>
              <option value="waiting">Waiting</option>
              <option value="done">Done</option>
            </select>
          </label>
          <button type="button" className={`ghost-button ${focusOnly ? 'active' : ''}`} onClick={() => setFocusOnly((value) => !value)}>
            Focus only
          </button>
        </div>
      </header>

      {isEmpty ? (
        <section className="shelf-empty-state">
          <h2>Your shelf is empty.</h2>
          <p>Capture a note, then return here to browse and continue work.</p>
        </section>
      ) : (
        groups.map((group) => (
          group.items.length ? (
            <section key={group.id} className="shelf-group" aria-label={group.label}>
              <div className="shelf-group__header">
                <h2>{group.label}</h2>
                <span>{group.items.length}</span>
              </div>
              <div className="shelf-group__items">
                {group.items.map((item) => (
                  <button key={item.note.id} type="button" className={`shelf-item shelf-item--${item.tone}`} onClick={() => onOpenNote(item.note.id)}>
                    <div className="shelf-item__head">
                      <strong>{getCompactDisplayTitle(item.note, 68)}</strong>
                      <span>{formatRecency(item.note.updatedAt)}</span>
                    </div>
                    <p>{getSummaryPreview(item.note, 150)}</p>
                    <div className="shelf-item__meta">
                      <span>{item.stateLabel}</span>
                      {item.projectLabel ? <span>{item.projectLabel}</span> : null}
                      {item.workspaceLabel ? <span>{item.workspaceLabel}</span> : null}
                      {item.relationCount > 0 ? <span>{item.relationCount} related</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null
        ))
      )}
    </section>
  );
}
