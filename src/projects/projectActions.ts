import { createProject, normalizeProjectMembership } from './projectModel';
import { now } from '../notes/noteModel';
import { ProjectModel, SceneState } from '../types';

function updateMembership(scene: SceneState, noteId: string, nextProjectIds: string[]): SceneState {
  return {
    ...scene,
    notes: scene.notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            projectIds: normalizeProjectMembership(nextProjectIds),
            updatedAt: now()
          }
        : note
    )
  };
}

export function createProjectInScene(scene: SceneState, input: { name: string; color?: string; description?: string }) {
  const trimmedName = input.name.trim();
  if (!trimmedName) return { scene, project: null as ProjectModel | null };

  const existing = scene.projects.find((project) => project.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) return { scene, project: existing };

  const project = createProject(trimmedName, input.color, input.description ?? '');
  return {
    scene: {
      ...scene,
      projects: [...scene.projects, project]
    },
    project
  };
}

export function toggleNoteProjectMembershipInScene(scene: SceneState, noteId: string, projectId: string): SceneState {
  const note = scene.notes.find((candidate) => candidate.id === noteId);
  if (!note || !scene.projects.some((project) => project.id === projectId)) return scene;

  const nextProjectIds = note.projectIds.includes(projectId)
    ? note.projectIds.filter((id) => id !== projectId)
    : [...note.projectIds, projectId];

  return updateMembership(scene, noteId, nextProjectIds);
}

export function createProjectAndAssignToNoteInScene(
  scene: SceneState,
  noteId: string,
  input: { name: string; color?: string; description?: string }
) {
  const created = createProjectInScene(scene, input);
  if (!created.project) return created.scene;
  return updateMembership(created.scene, noteId, [...(created.scene.notes.find((note) => note.id === noteId)?.projectIds ?? []), created.project.id]);
}

export function setProjectRevealInScene(scene: SceneState, projectId: string | null): SceneState {
  const nextProjectId = projectId && scene.projects.some((project) => project.id === projectId) ? projectId : null;
  if (scene.projectReveal.activeProjectId === nextProjectId) return scene;
  return {
    ...scene,
    projectReveal: {
      activeProjectId: nextProjectId
    }
  };
}
