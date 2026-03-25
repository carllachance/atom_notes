import { KeyboardEvent, MouseEvent, useMemo, useState } from 'react';
import { getCompactDisplayTitle, getRecapPreview, getSuggestedFollowUpPreview, getSummaryPreview, getUnresolvedPreview } from '../noteText';
import { NoteCardModel, NoteShelfSize, Project, Relationship, Workspace } from '../types';
import { resolveShelfSize } from './shelfSizing';

type GroupMode = 'recent' | 'focus' | 'waiting' | 'project' | 'type' | 'created' | 'edited' | 'pinned';
type StateFilter = 'all' | 'active' | 'waiting' | 'done';

type ShelfViewProps = {
  notes: NoteCardModel[];
  relationships: Relationship[];
  projects: Project[];
  workspaces: Workspace[];
  onOpenNote: (noteId: string) => void;
  onUpdateNote: (noteId: string, updates: Partial<NoteCardModel>) => void;
};

type ShelfItem = {
  note: NoteCardModel;
  relationCount: number;
  projectLabel: string | null;
  workspaceLabel: string | null;
  stateLabel: string;
  tone: 'paper' | 'panel';
  shelfSize: NoteShelfSize;
  previewLength: number;
  metadataLimit: number;
  isPinnedLarge: boolean;
  didDowngrade: boolean;
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
      const relationCount = relationCountById.get(note.id) ?? 0;
      const isOpenTask = note.intent === 'task' && note.taskState !== 'done';
      const autoSize: NoteShelfSize = note.inFocus || note.isFocus
        ? 'hero'
        : isOpenTask
          ? 'featured'
          : relationCount >= 4
            ? 'featured'
            : relationCount <= 1
              ? 'compact'
              : 'standard';
      const resolved = resolveShelfSize(note, autoSize, relationCount);
      const shelfSize = resolved.shelfSize;
      const previewLength = shelfSize === 'hero' ? 360 : shelfSize === 'featured' ? 290 : shelfSize === 'standard' ? 170 : 96;
      const metadataLimit = shelfSize === 'hero' ? 5 : shelfSize === 'featured' ? 4 : shelfSize === 'standard' ? 2 : 1;
      return {
        note,
        relationCount,
        projectLabel: primaryProject ? `${primaryProject.key} · ${primaryProject.name}` : null,
        workspaceLabel: workspace ? workspace.name : null,
        stateLabel: deriveStateLabel(note),
        tone: note.inFocus || note.isFocus ? 'paper' : 'panel',
        shelfSize,
        previewLength,
        metadataLimit,
        isPinnedLarge: resolved.isPinnedLarge,
        didDowngrade: resolved.didDowngrade
      };
    });
}

export function ShelfView({ notes, relationships, projects, workspaces, onOpenNote, onUpdateNote }: ShelfViewProps) {
  const [groupBy, setGroupBy] = useState<GroupMode>('recent');
  const [focusOnly, setFocusOnly] = useState(false);
  const [projectFilter, setProjectFilter] = useState('all');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);

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
  const activeFilterCount = [
    groupBy !== 'recent',
    focusOnly,
    projectFilter !== 'all',
    workspaceFilter !== 'all',
    stateFilter !== 'all'
  ].filter(Boolean).length;

  const activeFilterSummary = useMemo(() => {
    const summaryTokens: string[] = [];
    if (focusOnly) summaryTokens.push('Focus only');
    if (groupBy !== 'recent') {
      const groupLabel = {
        focus: 'In focus',
        waiting: 'Waiting',
        project: 'By project',
        type: 'By type',
        created: 'Recently created',
        edited: 'Recently edited',
        pinned: 'Pinned'
      }[groupBy];
      summaryTokens.push(groupLabel ?? 'Custom');
    }
    if (projectFilter !== 'all') {
      const project = projects.find((candidate) => candidate.id === projectFilter);
      summaryTokens.push(project ? project.key : 'Project');
    }
    if (workspaceFilter !== 'all') {
      const workspace = workspaces.find((candidate) => candidate.id === workspaceFilter);
      summaryTokens.push(workspace ? workspace.name : 'Workspace');
    }
    if (stateFilter !== 'all') {
      summaryTokens.push(stateFilter === 'done' ? 'Done' : stateFilter === 'waiting' ? 'Waiting' : 'Active');
    }
    return summaryTokens.slice(0, 2).join(' · ');
  }, [focusOnly, groupBy, projectFilter, projects, stateFilter, workspaceFilter, workspaces]);

  return (
    <section className="shelf-view" aria-label="Shelf">
      <header className="shelf-toolbar">
        <div className="shelf-toolbar__top-row">
          <button
            type="button"
            className={`ghost-button shelf-filter-toggle ${activeFilterCount > 0 ? 'has-active-filters' : ''}`}
            onClick={() => setMobileFiltersOpen((value) => !value)}
            aria-expanded={mobileFiltersOpen}
            aria-controls="shelf-filters-panel"
          >
            Filters
            {activeFilterCount > 0 ? <span className="shelf-filter-toggle__badge">{activeFilterCount}</span> : null}
          </button>
          {activeFilterSummary ? <p className="shelf-toolbar__summary">{activeFilterSummary}</p> : null}
        </div>

        <div id="shelf-filters-panel" className="shelf-toolbar__controls" data-mobile-open={mobileFiltersOpen}>
          <label>
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
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="all">All projects</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.key} · {project.name}</option>)}
            </select>
          </label>
          <label>
            <select value={workspaceFilter} onChange={(event) => setWorkspaceFilter(event.target.value)}>
              <option value="all">All workspaces</option>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
          </label>
          <label>
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as StateFilter)}>
              <option value="all">All states</option>
              <option value="active">Active</option>
              <option value="waiting">Waiting</option>
              <option value="done">Done</option>
            </select>
          </label>
          <button type="button" className={`ghost-button shelf-focus-filter ${focusOnly ? 'active' : ''}`} onClick={() => setFocusOnly((value) => !value)}>
            Focus only
          </button>
          <button type="button" className="ghost-button shelf-toolbar__done" onClick={() => setMobileFiltersOpen(false)}>
            Done
          </button>
        </div>
      </header>

      <button
        type="button"
        className="shelf-filters-backdrop"
        data-mobile-open={mobileFiltersOpen}
        onClick={() => setMobileFiltersOpen(false)}
        aria-label="Close filters"
      />

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
                  <article
                    key={item.note.id}
                    className={`shelf-item shelf-item--${item.tone} shelf-item--${item.shelfSize}`}
                    data-size={item.shelfSize}
                    tabIndex={0}
                    role="button"
                    onClick={() => onOpenNote(item.note.id)}
                    onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenNote(item.note.id);
                      }
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setActiveCardMenuId(item.note.id);
                    }}
                  >
                    <div className="shelf-item__head">
                      <strong>{getCompactDisplayTitle(item.note, 68)}</strong>
                      <span>{formatRecency(item.note.updatedAt)}</span>
                    </div>
                    <p>{getSummaryPreview(item.note, item.previewLength)}</p>
                    {(item.shelfSize === 'featured' || item.shelfSize === 'hero') ? (
                      <div className="shelf-item__detail">
                        {[getRecapPreview(item.note, 180), getUnresolvedPreview(item.note, 180), getSuggestedFollowUpPreview(item.note, 180)]
                          .filter((line): line is string => Boolean(line))
                          .slice(0, item.shelfSize === 'hero' ? 3 : 2)
                          .map((line, index) => <p key={`${item.note.id}-detail-${index}`}>{line}</p>)}
                        {item.isPinnedLarge && !getRecapPreview(item.note, 180) && !getUnresolvedPreview(item.note, 180) && !getSuggestedFollowUpPreview(item.note, 180) ? (
                          <p>Pick up here: add a recap, open question, or follow-up so this pinned card stays rich at a glance.</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="shelf-item__meta">
                      {[
                        item.stateLabel,
                        item.projectLabel,
                        item.workspaceLabel,
                        item.relationCount > 0 ? `${item.relationCount} related` : null,
                        item.note.attachments?.length ? `${item.note.attachments.length} attachment${item.note.attachments.length === 1 ? '' : 's'}` : null,
                        item.note.inferredRelationships?.length ? `${item.note.inferredRelationships.length} inferred` : null,
                        item.didDowngrade ? 'Auto-fit size' : null
                      ]
                        .filter((value): value is string => Boolean(value))
                        .slice(0, item.metadataLimit)
                        .map((label) => <span key={label}>{label}</span>)}
                    </div>
                    <div
                      className="shelf-item__overflow"
                      onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="ghost-button shelf-item__overflow-trigger"
                        aria-label="Card actions"
                        aria-haspopup="menu"
                        aria-expanded={activeCardMenuId === item.note.id}
                        onClick={() => setActiveCardMenuId((value) => value === item.note.id ? null : item.note.id)}
                      >
                        ⋯
                      </button>
                      <div className="shelf-item__size-actions" data-open={activeCardMenuId === item.note.id}>
                        <button type="button" className="ghost-button" onClick={() => { onUpdateNote(item.note.id, { shelfSize: 'compact' }); setActiveCardMenuId(null); }}>Make smaller</button>
                        <button type="button" className="ghost-button" onClick={() => { onUpdateNote(item.note.id, { shelfSize: 'standard' }); setActiveCardMenuId(null); }}>Standard size</button>
                        <button type="button" className="ghost-button" onClick={() => { onUpdateNote(item.note.id, { shelfSize: 'featured' }); setActiveCardMenuId(null); }}>Make larger</button>
                        <button type="button" className="ghost-button" onClick={() => { onUpdateNote(item.note.id, { shelfSize: 'hero' }); setActiveCardMenuId(null); }}>Feature this</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null
        ))
      )}
    </section>
  );
}
