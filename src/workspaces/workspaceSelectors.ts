import { NoteCardModel, SceneState, Workspace } from '../types';

export function getWorkspaceIdsForNote(note: Pick<NoteCardModel, 'workspaceIds' | 'workspaceId'>): string[] {
  if (Array.isArray(note.workspaceIds) && note.workspaceIds.length > 0) return note.workspaceIds;
  return note.workspaceId ? [note.workspaceId] : [];
}

export function getWorkspaceById(scene: SceneState, workspaceId: string | null): Workspace | null {
  if (!workspaceId) return null;
  return scene.workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

export function getNotesForWorkspace(notes: NoteCardModel[], workspaceId: string): NoteCardModel[] {
  return notes.filter((note) => getWorkspaceIdsForNote(note).includes(workspaceId));
}

export function getWorkspaceForNote(scene: SceneState, noteId: string): Workspace | null {
  const note = scene.notes.find((candidate) => candidate.id === noteId);
  const workspaceId = note ? getWorkspaceIdsForNote(note)[0] ?? null : null;
  if (!workspaceId) return null;
  return getWorkspaceById(scene, workspaceId);
}
