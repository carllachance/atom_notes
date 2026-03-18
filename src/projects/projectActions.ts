import { appendInsightTimelineEntries, createProjectTimelineEntries } from '../insights/insightTimeline';
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
  const previousProjectIds = scene.notes.find((note) => note.id === noteId)?.projectIds ?? [];

  const nextScene = {
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

  const nextProjectIds = nextScene.notes.find((note) => note.id === noteId)?.projectIds ?? [];
  return appendInsightTimelineEntries(nextScene, createProjectTimelineEntries(nextScene, noteId, previousProjectIds, nextProjectIds, t));
}

export function setNoteProjectsInScene(scene: SceneState, noteId: string, projectIds: string[]): SceneState {
  const validProjectIds = new Set(scene.projects.map((project) => project.id));
  const nextProjectIds = normalizeProjectIds(projectIds).filter((projectId) => validProjectIds.has(projectId));
  const previousProjectIds = scene.notes.find((note) => note.id === noteId)?.projectIds ?? [];
  const t = now();

  const nextScene = {
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

  return appendInsightTimelineEntries(nextScene, createProjectTimelineEntries(nextScene, noteId, previousProjectIds, nextProjectIds, t));
}
