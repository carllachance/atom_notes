import { buildSparseProjectConnectorSegments } from '../projects/projectSelectors';
import { getProjectById } from '../projects/projectSelectors';
import { getWorkspaceById } from '../workspaces/workspaceSelectors';
import { Lens, LensScopeMode, NoteCardModel, Project, Relationship, SceneState, Workspace } from '../types';

export type LensNoteEmphasis = 'primary' | 'supporting' | 'context';
export type LensProjectState = 'none' | 'member' | 'supporting';
export type LensWorkspaceState = 'none' | 'member' | 'supporting' | 'orphan';

export type LensNotePresentation = {
  emphasis: LensNoteEmphasis;
  surfaced: boolean;
  revealed: boolean;
  projectState: LensProjectState;
  projectAccent: string | null;
  workspaceState: LensWorkspaceState;
  workspaceLabel: string;
  contextLabel: string | null;
};

export type LensPresentation = {
  lens: Lens;
  lensLabel: string;
  visibleNotes: NoteCardModel[];
  archivedNotes: NoteCardModel[];
  noteMetaById: Record<string, LensNotePresentation>;
  revealMatchIds: string[];
  activeProject: Project | null;
  activeWorkspace: Workspace | null;
  projectConnectorSegments: ReturnType<typeof buildSparseProjectConnectorSegments>;
};

type NoteBuckets = {
  primaryIds: Set<string>;
  supportingIds: Set<string>;
  revealMatchIds: string[];
};

export function createDefaultLens(): Lens {
  return { kind: 'universe' };
}

function normalizeScopeMode(value: unknown): LensScopeMode {
  return value === 'strict' ? 'strict' : 'context';
}

export function normalizeLens(raw: unknown): Lens {
  if (raw === 'focus') return { kind: 'workspace', workspaceId: null, mode: 'strict' };
  if (raw === 'archive') return { kind: 'archive' };
  if (raw === 'all') return createDefaultLens();

  if (!raw || typeof raw !== 'object') return createDefaultLens();

  const candidate = raw as Partial<Lens> & {
    currentView?: 'canvas' | 'archive';
    projectReveal?: { activeProjectId?: string | null; isolate?: boolean };
    revealQuery?: string;
  };

  switch (candidate.kind) {
    case 'project':
      return {
        kind: 'project',
        projectId: typeof candidate.projectId === 'string' ? candidate.projectId : null,
        mode: normalizeScopeMode(candidate.mode)
      };
    case 'workspace':
      return {
        kind: 'workspace',
        workspaceId: typeof candidate.workspaceId === 'string' ? candidate.workspaceId : null,
        mode: normalizeScopeMode(candidate.mode)
      };
    case 'reveal':
      return {
        kind: 'reveal',
        query: String(candidate.query ?? '').trim(),
        workspaceId: typeof candidate.workspaceId === 'string' ? candidate.workspaceId : null,
        projectId: typeof candidate.projectId === 'string' ? candidate.projectId : null,
        mode: normalizeScopeMode(candidate.mode)
      };
    case 'archive':
      return { kind: 'archive' };
    case 'universe':
      return { kind: 'universe' };
    default: {
      if (candidate.projectReveal?.activeProjectId || candidate.projectReveal?.isolate) {
        return {
          kind: 'project',
          projectId: typeof candidate.projectReveal.activeProjectId === 'string' ? candidate.projectReveal.activeProjectId : null,
          mode: candidate.projectReveal.isolate ? 'strict' : 'context'
        };
      }
      if (typeof candidate.revealQuery === 'string' && candidate.revealQuery.trim()) {
        return {
          kind: 'reveal',
          query: candidate.revealQuery.trim(),
          workspaceId: null,
          projectId: null,
          mode: 'context'
        };
      }
      if (candidate.currentView === 'archive') return { kind: 'archive' };
      return createDefaultLens();
    }
  }
}

export function getLensLabel(lens: Lens, scene: Pick<SceneState, 'projects' | 'workspaces'>): string {
  if (lens.kind === 'archive') return 'Archive lens';
  if (lens.kind === 'universe') return 'Shared universe';
  if (lens.kind === 'project') {
    const project = scene.projects.find((candidate) => candidate.id === lens.projectId);
    return project ? `${project.key} project lens${lens.mode === 'strict' ? ' · strict' : ' · with context'}` : 'Project lens';
  }
  if (lens.kind === 'workspace') {
    const workspace = scene.workspaces.find((candidate) => candidate.id === lens.workspaceId);
    return workspace
      ? `${workspace.key} workspace lens${lens.mode === 'strict' ? ' · strict' : ' · with context'}`
      : 'Workspace lens';
  }

  const scopeBits = [
    lens.projectId ? scene.projects.find((candidate) => candidate.id === lens.projectId)?.key : null,
    lens.workspaceId ? scene.workspaces.find((candidate) => candidate.id === lens.workspaceId)?.key : null
  ].filter(Boolean);
  const scope = scopeBits.length ? ` · ${scopeBits.join(' / ')}` : '';
  return `Reveal lens${scope}`;
}

function matchesRevealQuery(note: NoteCardModel, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return `${note.title ?? ''}\n${note.body}`.toLowerCase().includes(normalized);
}

function collectNeighborIds(primaryIds: Set<string>, relationships: Relationship[], allowedIds: Set<string>) {
  const relatedIds = new Set<string>();

  for (const relationship of relationships) {
    const fromPrimary = primaryIds.has(relationship.fromId);
    const toPrimary = primaryIds.has(relationship.toId);
    if (!fromPrimary && !toPrimary) continue;

    const neighborId = fromPrimary ? relationship.toId : relationship.fromId;
    if (!allowedIds.has(neighborId) || primaryIds.has(neighborId)) continue;
    relatedIds.add(neighborId);
  }

  return relatedIds;
}

function getScopedNotes(notes: NoteCardModel[], lens: Lens) {
  if (lens.kind === 'project' || lens.kind === 'reveal') {
    const projectScoped = lens.projectId ? notes.filter((note) => note.projectIds.includes(lens.projectId!)) : notes;
    if (lens.kind !== 'reveal' || !lens.workspaceId) return projectScoped;
    return projectScoped.filter((note) => note.workspaceId === lens.workspaceId);
  }

  if (lens.kind === 'workspace') {
    return lens.workspaceId ? notes.filter((note) => note.workspaceId === lens.workspaceId) : notes;
  }

  return notes;
}

function resolveBuckets(scene: SceneState, lens: Lens, activeNoteId: string | null): NoteBuckets {
  const activeNotes = scene.notes.filter((note) => !note.archived);
  const allowedIds = new Set(activeNotes.map((note) => note.id));

  if (lens.kind === 'archive') {
    const archivedIds = new Set(scene.notes.filter((note) => note.archived).map((note) => note.id));
    return { primaryIds: archivedIds, supportingIds: new Set(), revealMatchIds: [] };
  }

  if (lens.kind === 'universe') {
    return {
      primaryIds: new Set(activeNotes.map((note) => note.id)),
      supportingIds: new Set(),
      revealMatchIds: []
    };
  }

  if (lens.kind === 'project') {
    const scopedNotes = getScopedNotes(activeNotes, lens);
    const primaryIds = new Set(scopedNotes.map((note) => note.id));
    const supportingIds = lens.mode === 'context' ? collectNeighborIds(primaryIds, scene.relationships, allowedIds) : new Set<string>();
    return { primaryIds, supportingIds, revealMatchIds: [] };
  }

  if (lens.kind === 'workspace') {
    const scopedNotes = getScopedNotes(activeNotes, lens);
    const primaryIds = new Set(scopedNotes.map((note) => note.id));
    const supportingIds = lens.mode === 'context' ? collectNeighborIds(primaryIds, scene.relationships, allowedIds) : new Set<string>();
    return { primaryIds, supportingIds, revealMatchIds: [] };
  }

  const scopedNotes = getScopedNotes(activeNotes, lens);
  const revealMatches = scopedNotes.filter((note) => matchesRevealQuery(note, lens.query));
  const primaryIds = new Set(revealMatches.map((note) => note.id));

  if (!primaryIds.size && activeNoteId) {
    const activeNote = activeNotes.find((note) => note.id === activeNoteId);
    if (activeNote && matchesRevealQuery(activeNote, lens.query)) {
      primaryIds.add(activeNote.id);
    }
  }

  const supportingIds = lens.mode === 'context' ? collectNeighborIds(primaryIds, scene.relationships, allowedIds) : new Set<string>();
  return { primaryIds, supportingIds, revealMatchIds: revealMatches.map((note) => note.id) };
}

function makeContextLabel(
  note: NoteCardModel,
  lens: Lens,
  activeProject: Project | null,
  activeWorkspace: Workspace | null,
  workspacesById: Map<string, Workspace>,
  isSupporting: boolean
) {
  if (lens.kind === 'project' && activeProject) {
    if (note.projectIds.includes(activeProject.id)) return `${activeProject.key} project`;
    if (isSupporting) {
      const workspaceLabel = activeWorkspace && note.workspaceId === activeWorkspace.id ? ` in ${activeWorkspace.key}` : '';
      return `Surfaced beyond ${activeProject.key}${workspaceLabel}`;
    }
  }

  if ((lens.kind === 'workspace' || lens.kind === 'reveal') && activeWorkspace) {
    if (note.workspaceId === activeWorkspace.id) return `${activeWorkspace.key} scope`;
    if (note.workspaceId) return `Surfaced from ${workspacesById.get(note.workspaceId)?.key ?? 'another workspace'}`;
    return 'No workspace assigned';
  }

  if (lens.kind === 'reveal' && isSupporting) return 'Surfaced by relationships';
  if (!note.workspaceId) return null;
  return null;
}

export function getLensPresentation(scene: SceneState): LensPresentation {
  const lens = normalizeLens(scene.lens);
  const archivedNotes = scene.notes.filter((note) => note.archived);
  const { primaryIds, supportingIds, revealMatchIds } = resolveBuckets(scene, lens, scene.activeNoteId);
  const visibleNotes =
    lens.kind === 'archive'
      ? archivedNotes
      : scene.notes.filter((note) => !note.archived && (primaryIds.has(note.id) || supportingIds.has(note.id)));
  const activeProject =
    lens.kind === 'project' || lens.kind === 'reveal' ? getProjectById(scene, lens.projectId ?? null) : null;
  const activeWorkspace =
    lens.kind === 'workspace' || lens.kind === 'reveal' ? getWorkspaceById(scene, lens.workspaceId ?? null) : null;
  const noteMetaById: Record<string, LensNotePresentation> = {};
  const workspacesById = new Map(scene.workspaces.map((workspace) => [workspace.id, workspace]));
  const projectsById = new Map(scene.projects.map((project) => [project.id, project]));

  for (const note of visibleNotes) {
    const isPrimary = primaryIds.has(note.id);
    const isSupporting = supportingIds.has(note.id);
    const projectState: LensProjectState = activeProject
      ? note.projectIds.includes(activeProject.id)
        ? 'member'
        : isSupporting
          ? 'supporting'
          : 'none'
      : 'none';
    const workspaceState: LensWorkspaceState = activeWorkspace
      ? note.workspaceId === activeWorkspace.id
        ? 'member'
        : note.workspaceId
          ? 'supporting'
          : 'orphan'
      : note.workspaceId
        ? 'none'
        : 'orphan';
    const primaryProject = note.projectIds.map((projectId) => projectsById.get(projectId)).find(Boolean) ?? null;
    const projectAccent = activeProject && note.projectIds.includes(activeProject.id)
      ? activeProject.color
      : primaryProject?.color ?? null;

    const workspaceLabel = note.workspaceId
      ? (() => {
          const workspace = workspacesById.get(note.workspaceId);
          return workspace ? `${workspace.key} · ${workspace.name}` : 'Workspace assigned';
        })()
      : 'No workspace assigned';

    noteMetaById[note.id] = {
      emphasis: isPrimary ? 'primary' : isSupporting ? 'supporting' : 'context',
      surfaced: isSupporting,
      revealed: revealMatchIds.includes(note.id),
      projectState,
      projectAccent,
      workspaceState,
      workspaceLabel,
      contextLabel: makeContextLabel(note, lens, activeProject, activeWorkspace, workspacesById, isSupporting)
    };
  }

  const highlightedProjectNotes = visibleNotes.filter((note) => noteMetaById[note.id]?.projectState === 'member');

  return {
    lens,
    lensLabel: getLensLabel(lens, scene),
    visibleNotes,
    archivedNotes,
    noteMetaById,
    revealMatchIds,
    activeProject,
    activeWorkspace,
    projectConnectorSegments: activeProject ? buildSparseProjectConnectorSegments(highlightedProjectNotes) : []
  };
}
