import { NoteCardModel, SceneState, Workspace } from '../types';

export function getWorkspaceById(scene: SceneState, workspaceId: string | null): Workspace | null {
  if (!workspaceId) return null;
  return scene.workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
}

export function getNotesForWorkspace(notes: NoteCardModel[], workspaceId: string): NoteCardModel[] {
  return notes.filter((note) => note.workspaceId === workspaceId);
}

export function getWorkspaceForNote(scene: SceneState, noteId: string): Workspace | null {
  const note = scene.notes.find((candidate) => candidate.id === noteId);
  if (!note?.workspaceId) return null;
  return getWorkspaceById(scene, note.workspaceId);
}
