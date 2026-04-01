import { now } from '../notes/noteModel';
import { SceneState } from '../types';
import { createWorkspace, WorkspaceDraft } from './workspaceModel';
import { getWorkspaceIdsForNote } from './workspaceSelectors';

function resolveWorkspace(scene: SceneState, draft: WorkspaceDraft) {
  const requestedKey = String(draft.key ?? draft.name ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const existing = scene.workspaces.find((workspace) => workspace.key === requestedKey && requestedKey);
  if (existing) {
    const updated = {
      ...existing,
      name: String(draft.name ?? existing.name).trim() || existing.name,
      color: String(draft.color ?? existing.color).trim() || existing.color,
      description: String(draft.description ?? existing.description).trim(),
      updatedAt: now()
    };

    return {
      workspace: updated,
      workspaces: scene.workspaces.map((workspace) => (workspace.id === existing.id ? updated : workspace))
    };
  }

  const workspace = createWorkspace(draft, scene.workspaces.length);
  return {
    workspace,
    workspaces: [...scene.workspaces, workspace]
  };
}

export function createWorkspaceInScene(scene: SceneState, draft: WorkspaceDraft): SceneState {
  const { workspaces } = resolveWorkspace(scene, draft);
  return { ...scene, workspaces };
}

export function createWorkspaceAndAssignToNoteInScene(scene: SceneState, noteId: string, draft: WorkspaceDraft): SceneState {
  const { workspace, workspaces } = resolveWorkspace(scene, draft);
  const t = now();

  return {
    ...scene,
    workspaces,
    notes: scene.notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            workspaceIds: Array.from(new Set([...getWorkspaceIdsForNote(note), workspace.id])),
            workspaceId: workspace.id,
            updatedAt: t,
            trace: 'scoped'
          }
        : note
    )
  };
}

export function setNoteWorkspaceInScene(scene: SceneState, noteId: string, workspaceId: string | null): SceneState {
  const nextWorkspaceIds = workspaceId ? [workspaceId] : [];
  return setNoteWorkspacesInScene(scene, noteId, nextWorkspaceIds);
}

export function setNoteWorkspacesInScene(scene: SceneState, noteId: string, workspaceIds: string[]): SceneState {
  const validWorkspaceIds = new Set(scene.workspaces.map((workspace) => workspace.id));
  const nextWorkspaceIds = workspaceIds.filter((workspaceId) => validWorkspaceIds.has(workspaceId));
  const nextWorkspaceId = nextWorkspaceIds[0] ?? null;
  const t = now();

  return {
    ...scene,
    notes: scene.notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            workspaceIds: nextWorkspaceIds,
            workspaceId: nextWorkspaceId,
            updatedAt: t,
            trace: nextWorkspaceId ? 'scoped' : 'idle'
          }
        : note
    )
  };
}
