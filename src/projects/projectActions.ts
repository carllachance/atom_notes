import { now } from '../notes/noteModel';
import { SceneState } from '../types';
import { createProject, normalizeProjectIds, ProjectDraft } from './projectModel';

function resolveProject(scene: SceneState, draft: ProjectDraft) {
  const requestedKey = String(draft.key ?? draft.name ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const existing = scene.projects.find((project) => project.key === requestedKey && requestedKey);
  if (existing) {
    const updated = {
      ...existing,
      name: String(draft.name ?? existing.name).trim() || existing.name,
      color: String(draft.color ?? existing.color).trim() || existing.color,
      description: String(draft.description ?? existing.description).trim(),
      updatedAt: now()
    };

    return {
      project: updated,
      projects: scene.projects.map((project) => (project.id === existing.id ? updated : project))
    };
  }

  const project = createProject(draft, scene.projects.length);
  return {
    project,
    projects: [...scene.projects, project]
  };
}

export function createProjectInScene(scene: SceneState, draft: ProjectDraft): SceneState {
  const { projects } = resolveProject(scene, draft);
  return { ...scene, projects };
}

export function createProjectAndAssignToNoteInScene(scene: SceneState, noteId: string, draft: ProjectDraft): SceneState {
  const { project, projects } = resolveProject(scene, draft);
  const t = now();

  return {
    ...scene,
    projects,
    notes: scene.notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            projectIds: normalizeProjectIds([...note.projectIds, project.id]),
            updatedAt: t,
            trace: 'projected'
          }
        : note
    )
  };
}

export function setNoteProjectsInScene(scene: SceneState, noteId: string, projectIds: string[]): SceneState {
  const validProjectIds = new Set(scene.projects.map((project) => project.id));
  const nextProjectIds = normalizeProjectIds(projectIds).filter((projectId) => validProjectIds.has(projectId));
  const t = now();

  return {
    ...scene,
    notes: scene.notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            projectIds: nextProjectIds,
            updatedAt: t,
            trace: nextProjectIds.length > 0 ? 'projected' : 'idle'
          }
        : note
    )
  };
}

export function setProjectRevealInScene(scene: SceneState, activeProjectId: string | null): SceneState {
  const validProjectIds = new Set(scene.projects.map((project) => project.id));
  const nextProjectId = activeProjectId && validProjectIds.has(activeProjectId) ? activeProjectId : null;

  return {
    ...scene,
    projectReveal: {
      ...scene.projectReveal,
      activeProjectId: nextProjectId
    }
  };
}

export function setProjectRevealIsolationInScene(scene: SceneState, isolate: boolean): SceneState {
  return {
    ...scene,
    projectReveal: {
      ...scene.projectReveal,
      isolate
    }
  };
}
