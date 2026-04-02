import { buildSparseProjectConnectorSegments, getProjectById } from '../projects/projectSelectors';
import { querySearchIndex } from '../search/searchService';
import { getWorkspaceById, getWorkspaceIdsForNote } from '../workspaces/workspaceSelectors';
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

function normalizeWorkspaceScopeIds(value: unknown, fallbackWorkspaceId: string | null = null): string[] {
  const rawIds = Array.isArray(value)
    ? value
    : typeof fallbackWorkspaceId === 'string' && fallbackWorkspaceId.trim()
      ? [fallbackWorkspaceId]
      : [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const candidate of rawIds) {
    const workspaceId = typeof candidate === 'string' ? candidate.trim() : '';
    if (!workspaceId || seen.has(workspaceId)) continue;
    seen.add(workspaceId);
    normalized.push(workspaceId);
  }

  return normalized;
}

export function getLensWorkspaceIds(lens: Lens): string[] {
  if (lens.kind !== 'workspace' && lens.kind !== 'reveal') return [];
  return normalizeWorkspaceScopeIds(lens.workspaceIds, lens.workspaceId ?? null);
}

function getPrimaryLensWorkspaceId(lens: Lens): string | null {
  return getLensWorkspaceIds(lens)[0] ?? null;
}

function normalizeScopeMode(value: unknown): LensScopeMode {
  return value === 'strict' ? 'strict' : 'context';
}

export function normalizeLens(raw: unknown): Lens {
  if (raw === 'focus') return { kind: 'workspace', workspaceId: null, workspaceIds: [], mode: 'strict' };
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
    case 'workspace': {
      const workspaceIds = normalizeWorkspaceScopeIds(
        (candidate as Partial<Lens> & { workspaceIds?: unknown }).workspaceIds,
        typeof candidate.workspaceId === 'string' ? candidate.workspaceId : null
      );
      return {
        kind: 'workspace',
        workspaceId: workspaceIds[0] ?? null,
        workspaceIds,
        mode: normalizeScopeMode(candidate.mode)
      };
    }
    case 'library':
      return { kind: 'library' };
    case 'reveal': {
      const workspaceIds = normalizeWorkspaceScopeIds(
        (candidate as Partial<Lens> & { workspaceIds?: unknown }).workspaceIds,
        typeof candidate.workspaceId === 'string' ? candidate.workspaceId : null
      );
      return {
        kind: 'reveal',
        query: String(candidate.query ?? '').trim(),
        workspaceId: workspaceIds[0] ?? null,
        workspaceIds,
        projectId: typeof candidate.projectId === 'string' ? candidate.projectId : null,
        mode: normalizeScopeMode(candidate.mode)
      };
    }
    case 'archive':
      return { kind: 'archive' };
    case 'universe':
      return { kind: 'universe' };
    default:
      if (candidate.projectReveal?.activeProjectId || candidate.projectReveal?.isolate) {
        return {
          kind: 'project',
          projectId: typeof candidate.projectReveal.activeProjectId === 'string' ? candidate.projectReveal.activeProjectId : null,
          mode: candidate.projectReveal.isolate ? 'strict' : 'context'
        };
      }
      if (typeof candidate.revealQuery === 'string' && candidate.revealQuery.trim()) {
        return { kind: 'reveal', query: candidate.revealQuery.trim(), workspaceId: null, workspaceIds: [], projectId: null, mode: 'context' };
      }
      if (candidate.currentView === 'archive') return { kind: 'archive' };
      return createDefaultLens();
  }
}

export function getLensLabel(lens: Lens, scene: Pick<SceneState, 'projects' | 'workspaces'>): string {
  if (lens.kind === 'archive') return 'Archive lens';
  if (lens.kind === 'universe') return 'Shared universe';
  if (lens.kind === 'library') return 'Library lens';
  if (lens.kind === 'project') {
    const project = scene.projects.find((candidate) => candidate.id === lens.projectId);
    return project ? `${project.name} project lens${lens.mode === 'strict' ? ' · strict' : ' · with context'}` : 'Project lens';
  }
  if (lens.kind === 'workspace') {
    const scopedWorkspaces = getLensWorkspaceIds(lens)
      .map((workspaceId) => scene.workspaces.find((candidate) => candidate.id === workspaceId))
      .filter(Boolean);
    if (scopedWorkspaces.length === 1) {
      return `${scopedWorkspaces[0]!.name} workspace lens${lens.mode === 'strict' ? ' · strict' : ' · with context'}`;
    }
    if (scopedWorkspaces.length > 1) {
      return `${scopedWorkspaces[0]!.name} +${scopedWorkspaces.length - 1} workspace lens${lens.mode === 'strict' ? ' · strict' : ' · with context'}`;
    }
    return 'Workspace lens';
  }

  const scopeBits = [
    lens.projectId ? scene.projects.find((candidate) => candidate.id === lens.projectId)?.name : null,
    ...getLensWorkspaceIds(lens).map((workspaceId) => scene.workspaces.find((candidate) => candidate.id === workspaceId)?.name ?? null)
  ].filter(Boolean);
  return `Reveal lens${scopeBits.length ? ` · ${scopeBits.join(' / ')}` : ''}`;
}

function matchesRevealQuery(note: NoteCardModel, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return `${note.title ?? ''}\n${note.body}`.toLowerCase().includes(normalized);
}

function hasLibraryMaterial(note: NoteCardModel) {
  return Boolean(
    (note.attachments?.length ?? 0) ||
    (note.provenance?.externalReferences?.length ?? 0) ||
    note.intent === 'link'
  );
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
    const projectId = lens.projectId ?? null;
    const projectScoped = projectId ? notes.filter((note) => note.projectIds.includes(projectId)) : notes;
    const workspaceIds = lens.kind === 'reveal' ? getLensWorkspaceIds(lens) : [];
    if (lens.kind !== 'reveal' || !workspaceIds.length) return projectScoped;
    return projectScoped.filter((note) => getWorkspaceIdsForNote(note).some((workspaceId) => workspaceIds.includes(workspaceId)));
  }

  if (lens.kind === 'workspace') {
    const workspaceIds = getLensWorkspaceIds(lens);
    return workspaceIds.length
      ? notes.filter((note) => getWorkspaceIdsForNote(note).some((workspaceId) => workspaceIds.includes(workspaceId)))
      : notes;
  }

  if (lens.kind === 'library') {
    return notes.filter((note) => hasLibraryMaterial(note));
  }

  return notes;
}

function resolveBuckets(scene: SceneState, lens: Lens, activeNoteId: string | null): NoteBuckets {
  const activeNotes = scene.notes.filter((note) => !note.archived && !note.deleted);
  const allowedIds = new Set(activeNotes.map((note) => note.id));

  if (lens.kind === 'archive') {
    const archivedIds = new Set(scene.notes.filter((note) => note.archived && !note.deleted).map((note) => note.id));
    return { primaryIds: archivedIds, supportingIds: new Set(), revealMatchIds: [] };
  }

  if (lens.kind === 'universe') {
    return { primaryIds: new Set(activeNotes.map((note) => note.id)), supportingIds: new Set(), revealMatchIds: [] };
  }

  if (lens.kind === 'project' || lens.kind === 'workspace' || lens.kind === 'library') {
    const scopedNotes = getScopedNotes(activeNotes, lens);
    const primaryIds = new Set(scopedNotes.map((note) => note.id));
    const supportingIds = lens.kind === 'library'
      ? new Set<string>()
      : lens.mode === 'context'
        ? collectNeighborIds(primaryIds, scene.relationships, allowedIds)
        : new Set<string>();
    return { primaryIds, supportingIds, revealMatchIds: [] };
  }

  const scopedNotes = getScopedNotes(activeNotes, lens);
  const matchedIds = new Set(querySearchIndex(scene, lens.query).map((hit) => hit.noteId));
  const revealMatches = scopedNotes.filter((note) => matchedIds.has(note.id) || matchesRevealQuery(note, lens.query));
  const primaryIds = new Set(revealMatches.map((note) => note.id));

  if (!primaryIds.size && activeNoteId) {
    const activeNote = activeNotes.find((note) => note.id === activeNoteId);
    if (activeNote && (matchedIds.has(activeNote.id) || matchesRevealQuery(activeNote, lens.query))) primaryIds.add(activeNote.id);
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
  const workspaceIds = getWorkspaceIdsForNote(note);

  if (lens.kind === 'project' && activeProject) {
    if (note.projectIds.includes(activeProject.id)) return `${activeProject.key} project`;
    if (isSupporting) {
      const workspaceLabel = activeWorkspace && workspaceIds.includes(activeWorkspace.id) ? ` in ${activeWorkspace.name}` : '';
      return `Surfaced beyond ${activeProject.name}${workspaceLabel}`;
    }
  }

  if ((lens.kind === 'workspace' || lens.kind === 'reveal') && activeWorkspace) {
    if (workspaceIds.includes(activeWorkspace.id)) return `${activeWorkspace.name} scope`;
    if (workspaceIds.length) return `Surfaced from ${workspacesById.get(workspaceIds[0])?.name ?? 'another workspace'}`;
    return 'No workspace assigned';
  }

  if (lens.kind === 'library') {
    return hasLibraryMaterial(note) ? 'Library material' : null;
  }

  if (lens.kind === 'reveal' && isSupporting) return 'Surfaced by relationships';
  return null;
}

export function getLensPresentation(scene: SceneState): LensPresentation {
  const lens = normalizeLens(scene.lens);
  const archivedNotes = scene.notes.filter((note) => note.archived && !note.deleted);
  const { primaryIds, supportingIds, revealMatchIds } = resolveBuckets(scene, lens, scene.activeNoteId);
  const visibleNotes = lens.kind === 'archive'
    ? archivedNotes
    : scene.notes.filter((note) => !note.archived && !note.deleted && (primaryIds.has(note.id) || supportingIds.has(note.id)));
  const activeProject = lens.kind === 'project' || lens.kind === 'reveal' ? getProjectById(scene, lens.projectId ?? null) : null;
  const activeWorkspace = lens.kind === 'workspace' || lens.kind === 'reveal' ? getWorkspaceById(scene, getPrimaryLensWorkspaceId(lens)) : null;
  const scopedWorkspaceIds = getLensWorkspaceIds(lens);
  const noteMetaById: Record<string, LensNotePresentation> = {};
  const workspacesById = new Map(scene.workspaces.map((workspace) => [workspace.id, workspace]));
  const projectsById = new Map(scene.projects.map((project) => [project.id, project]));

  for (const note of visibleNotes) {
    const isPrimary = primaryIds.has(note.id);
    const isSupporting = supportingIds.has(note.id);
    const workspaceIds = getWorkspaceIdsForNote(note);
    const projectState: LensProjectState = activeProject
      ? note.projectIds.includes(activeProject.id)
        ? 'member'
        : isSupporting
          ? 'supporting'
          : 'none'
      : 'none';
    const workspaceState: LensWorkspaceState = scopedWorkspaceIds.length
      ? workspaceIds.some((workspaceId) => scopedWorkspaceIds.includes(workspaceId))
        ? 'member'
        : workspaceIds.length
          ? 'supporting'
          : 'orphan'
      : workspaceIds.length
        ? 'none'
        : 'orphan';
    const primaryProject = note.projectIds.map((projectId) => projectsById.get(projectId)).find(Boolean) ?? null;
    const projectAccent = activeProject && note.projectIds.includes(activeProject.id) ? activeProject.color : primaryProject?.color ?? null;
    const workspaceLabel = workspaceIds.length
      ? workspaceIds
          .map((workspaceId) => workspacesById.get(workspaceId))
          .filter(Boolean)
          .map((workspace) => `${workspace!.key} · ${workspace!.name}`)
          .join(' + ')
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
