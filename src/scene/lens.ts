import { getRankedRelationshipsForNote, getRelationshipTargetNoteId } from '../relationshipLogic';
import { Lens, NoteCardModel, ProjectId, SceneState, WorkspaceId } from '../types';

export type LensEmphasis = 'strong' | 'context';

export type LensNoteState = {
  emphasis: LensEmphasis;
  offScope: boolean;
  contextLabel: string;
};

export type ResolvedLens = {
  lens: Lens;
  visibleNotes: NoteCardModel[];
  archivedNotes: NoteCardModel[];
  noteStates: Record<string, LensNoteState>;
  activeLensLabel: string;
  activeLensDescription: string;
  emptyMessage: string | null;
  availableWorkspaceIds: WorkspaceId[];
  availableProjectIds: ProjectId[];
};

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim()))].sort(
    (a, b) => a.localeCompare(b)
  );
}

function sortNotesForCanvas(notes: NoteCardModel[]): NoteCardModel[] {
  return [...notes].sort((a, b) => {
    if (a.z !== b.z) return a.z - b.z;
    return a.id.localeCompare(b.id);
  });
}

export function createWorkspaceLens(workspaceId: WorkspaceId | null): Lens {
  return { kind: 'workspace', workspaceId };
}

export function createProjectLens(projectId: ProjectId, workspaceId: WorkspaceId | null): Lens {
  return { kind: 'project', projectId, workspaceId };
}

export function createRevealQueryLens(query: string, workspaceId: WorkspaceId | null): Lens {
  return { kind: 'reveal', mode: 'query', query: query.trim(), workspaceId };
}

export function createRelationshipLens(noteId: string, workspaceId: WorkspaceId | null): Lens {
  return { kind: 'reveal', mode: 'relationship', noteId, workspaceId };
}

export function createArchiveLens(): Lens {
  return { kind: 'archive' };
}

export function isWorkspaceLens(lens: Lens): boolean {
  return lens.kind === 'workspace';
}

export function isProjectLens(lens: Lens): lens is Extract<Lens, { kind: 'project' }> {
  return lens.kind === 'project';
}

export function isRevealQueryLens(lens: Lens): lens is Extract<Lens, { kind: 'reveal'; mode: 'query' }> {
  return lens.kind === 'reveal' && lens.mode === 'query';
}

export function getLensWorkspaceId(lens: Lens): WorkspaceId | null {
  if (lens.kind === 'workspace') return lens.workspaceId;
  if (lens.kind === 'project') return lens.workspaceId;
  if (lens.kind === 'reveal') return lens.workspaceId;
  return null;
}

export function getLensRevealQuery(lens: Lens): string {
  return isRevealQueryLens(lens) ? lens.query : '';
}

export function getLensProjectId(lens: Lens): ProjectId | null {
  return isProjectLens(lens) ? lens.projectId : null;
}

export function getAllWorkspaceIds(notes: NoteCardModel[]): WorkspaceId[] {
  return uniqueSorted(notes.flatMap((note) => [note.workspaceId, ...note.workspaceAffinities]));
}

export function getAllProjectIds(notes: NoteCardModel[]): ProjectId[] {
  return uniqueSorted(notes.flatMap((note) => note.projectIds));
}

export function getNoteWorkspaceAffinities(note: NoteCardModel): WorkspaceId[] {
  return uniqueSorted([note.workspaceId, ...note.workspaceAffinities]);
}

export function noteBelongsToWorkspaceScope(note: NoteCardModel, workspaceId: WorkspaceId | null): boolean {
  if (!workspaceId) return true;
  return getNoteWorkspaceAffinities(note).includes(workspaceId);
}

export function noteBelongsToProject(note: NoteCardModel, projectId: ProjectId): boolean {
  return note.projectIds.includes(projectId);
}

function noteMatchesQuery(note: NoteCardModel, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return `${note.title ?? ''}\n${note.body}`.toLowerCase().includes(normalized);
}

function describeScopeContext(note: NoteCardModel, workspaceId: WorkspaceId | null, emphasis: LensEmphasis): LensNoteState {
  const originLabel = note.workspaceId ?? 'Unscoped';
  const projects = note.projectIds.length ? ` · ${note.projectIds.join(', ')}` : '';

  if (!workspaceId) {
    return {
      emphasis,
      offScope: false,
      contextLabel: `${originLabel}${projects}`
    };
  }

  const inScope = noteBelongsToWorkspaceScope(note, workspaceId);
  if (inScope) {
    if (note.workspaceId && note.workspaceId !== workspaceId) {
      return {
        emphasis,
        offScope: true,
        contextLabel: `Shared into ${workspaceId} · from ${originLabel}${projects}`
      };
    }

    return {
      emphasis,
      offScope: false,
      contextLabel: `${workspaceId}${projects}`
    };
  }

  return {
    emphasis,
    offScope: true,
    contextLabel: `Outside ${workspaceId} · from ${originLabel}${projects}`
  };
}

function resolveWorkspaceView(scene: SceneState, workspaceId: WorkspaceId | null) {
  const visibleNotes = sortNotesForCanvas(
    scene.notes.filter((note) => !note.archived && noteBelongsToWorkspaceScope(note, workspaceId))
  );

  return {
    visibleNotes,
    noteStates: Object.fromEntries(
      visibleNotes.map((note) => [note.id, describeScopeContext(note, workspaceId, 'strong')])
    )
  };
}

function resolveProjectView(scene: SceneState, projectId: ProjectId, workspaceId: WorkspaceId | null) {
  const visibleNotes = sortNotesForCanvas(
    scene.notes.filter((note) => !note.archived && noteBelongsToProject(note, projectId))
  );

  return {
    visibleNotes,
    noteStates: Object.fromEntries(
      visibleNotes.map((note) => [note.id, describeScopeContext(note, workspaceId, 'strong')])
    )
  };
}

function resolveRevealQueryView(scene: SceneState, query: string, workspaceId: WorkspaceId | null) {
  const visibleNotes = sortNotesForCanvas(scene.notes.filter((note) => !note.archived && noteMatchesQuery(note, query)));

  return {
    visibleNotes,
    noteStates: Object.fromEntries(
      visibleNotes.map((note) => {
        const inScope = noteBelongsToWorkspaceScope(note, workspaceId);
        const emphasis: LensEmphasis = workspaceId && !inScope ? 'context' : 'strong';
        return [note.id, describeScopeContext(note, workspaceId, emphasis)];
      })
    )
  };
}

function resolveRelationshipView(scene: SceneState, noteId: string, workspaceId: WorkspaceId | null) {
  const activeNote = scene.notes.find((note) => note.id === noteId);
  if (!activeNote || activeNote.archived) {
    return { visibleNotes: [] as NoteCardModel[], noteStates: {} as Record<string, LensNoteState> };
  }

  const notesById = new Map(scene.notes.map((note) => [note.id, note]));
  const rankedTargets = getRankedRelationshipsForNote(noteId, scene)
    .map((item) => notesById.get(getRelationshipTargetNoteId(item.relationship, noteId)))
    .filter((note): note is NoteCardModel => Boolean(note && !note.archived));

  const visibleNotes = sortNotesForCanvas([activeNote, ...rankedTargets.slice(0, 10)]);
  const noteStates = Object.fromEntries(
    visibleNotes.map((note) => {
      const emphasis: LensEmphasis = note.id === noteId ? 'strong' : noteBelongsToWorkspaceScope(note, workspaceId) ? 'strong' : 'context';
      return [note.id, describeScopeContext(note, workspaceId, emphasis)];
    })
  );

  return { visibleNotes, noteStates };
}

function getLensCopy(lens: Lens): Pick<ResolvedLens, 'activeLensLabel' | 'activeLensDescription' | 'emptyMessage'> {
  if (lens.kind === 'archive') {
    return {
      activeLensLabel: 'Archive lens',
      activeLensDescription: 'Historical notes remain reachable without competing with the active canvas.',
      emptyMessage: 'No archived notes yet.'
    };
  }

  if (lens.kind === 'workspace') {
    return {
      activeLensLabel: lens.workspaceId ? `Workspace · ${lens.workspaceId}` : 'Shared universe',
      activeLensDescription: lens.workspaceId
        ? 'Workspace is a focusing cue. Affinities and cross-scope reveals can still surface notes from elsewhere.'
        : 'All live notes share one universe. Workspace metadata remains visible as context, not containment.',
      emptyMessage: lens.workspaceId
        ? `No notes are currently scoped into ${lens.workspaceId}.`
        : 'No active notes yet. Capture something to begin.'
    };
  }

  if (lens.kind === 'project') {
    return {
      activeLensLabel: `Project · ${lens.projectId}`,
      activeLensDescription: 'Projects gather notes across workspaces while preserving their origin and scope cues.',
      emptyMessage: `No notes are attached to project ${lens.projectId}.`
    };
  }

  if (lens.mode === 'relationship') {
    return {
      activeLensLabel: 'Relationship reveal',
      activeLensDescription: 'The note’s local neighborhood is surfaced without implying a separate graph universe.',
      emptyMessage: 'No connected notes are visible yet.'
    };
  }

  return {
    activeLensLabel: lens.query ? `Reveal · “${lens.query}”` : 'Reveal lens',
    activeLensDescription: 'Reveal searches the shared universe, then quiets off-scope matches with explicit context cues.',
    emptyMessage: lens.query ? `No notes matched “${lens.query}”.` : 'Type a reveal query to surface notes.'
  };
}

export function applyLens(scene: SceneState, lens: Lens = scene.lens): ResolvedLens {
  const archivedNotes = sortNotesForCanvas(scene.notes.filter((note) => note.archived));
  const activeCopy = getLensCopy(lens);

  if (lens.kind === 'archive') {
    return {
      lens,
      visibleNotes: archivedNotes,
      archivedNotes,
      noteStates: Object.fromEntries(archivedNotes.map((note) => [note.id, describeScopeContext(note, null, 'context')])),
      availableWorkspaceIds: getAllWorkspaceIds(scene.notes),
      availableProjectIds: getAllProjectIds(scene.notes),
      ...activeCopy
    };
  }

  const resolved =
    lens.kind === 'workspace'
      ? resolveWorkspaceView(scene, lens.workspaceId)
      : lens.kind === 'project'
        ? resolveProjectView(scene, lens.projectId, lens.workspaceId)
        : lens.mode === 'query'
          ? resolveRevealQueryView(scene, lens.query, lens.workspaceId)
          : resolveRelationshipView(scene, lens.noteId, lens.workspaceId);

  return {
    lens,
    visibleNotes: resolved.visibleNotes,
    archivedNotes,
    noteStates: resolved.noteStates,
    availableWorkspaceIds: getAllWorkspaceIds(scene.notes),
    availableProjectIds: getAllProjectIds(scene.notes),
    ...activeCopy
  };
}

export function normalizeLens(raw: unknown): Lens {
  if (raw === 'archive') return createArchiveLens();
  if (raw === 'focus') return createWorkspaceLens(null);
  if (raw === 'all') return createWorkspaceLens(null);
  if (!raw || typeof raw !== 'object') return createWorkspaceLens(null);

  const lens = raw as Partial<Lens> & { query?: unknown; workspaceId?: unknown; projectId?: unknown; noteId?: unknown; mode?: unknown };

  if (lens.kind === 'archive') return createArchiveLens();
  if (lens.kind === 'workspace') return createWorkspaceLens(typeof lens.workspaceId === 'string' ? lens.workspaceId : null);
  if (lens.kind === 'project' && typeof lens.projectId === 'string') {
    return createProjectLens(lens.projectId, typeof lens.workspaceId === 'string' ? lens.workspaceId : null);
  }
  if (lens.kind === 'reveal' && lens.mode === 'relationship' && typeof lens.noteId === 'string') {
    return createRelationshipLens(lens.noteId, typeof lens.workspaceId === 'string' ? lens.workspaceId : null);
  }
  if (lens.kind === 'reveal') {
    return createRevealQueryLens(typeof lens.query === 'string' ? lens.query : '', typeof lens.workspaceId === 'string' ? lens.workspaceId : null);
  }

  return createWorkspaceLens(null);
}
