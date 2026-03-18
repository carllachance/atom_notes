import { NoteCardModel, ProjectModel, SceneState } from '../types';

export type ProjectSummary = ProjectModel & { noteCount: number };

export type ProjectRevealPresentation = {
  project: ProjectModel | null;
  memberNotes: NoteCardModel[];
  backgroundNotes: NoteCardModel[];
  memberNoteIds: string[];
  backgroundNoteIds: string[];
};

export function getProjectById(projects: ProjectModel[], projectId: string | null) {
  if (!projectId) return null;
  return projects.find((project) => project.id === projectId) ?? null;
}

export function getNotesByProjectId(notes: NoteCardModel[], projectId: string) {
  return notes.filter((note) => note.projectIds.includes(projectId));
}

export function getProjectsForNote(note: NoteCardModel | null, projects: ProjectModel[]) {
  if (!note) return [];
  const byId = new Map(projects.map((project) => [project.id, project]));
  return note.projectIds.map((projectId) => byId.get(projectId)).filter((project): project is ProjectModel => Boolean(project));
}

export function getProjectSummaries(scene: SceneState): ProjectSummary[] {
  return scene.projects
    .map((project) => ({
      ...project,
      noteCount: scene.notes.filter((note) => note.projectIds.includes(project.id) && !note.archived).length
    }))
    .sort((a, b) => {
      if (b.noteCount !== a.noteCount) return b.noteCount - a.noteCount;
      return a.name.localeCompare(b.name);
    });
}

export function getProjectRevealPresentation(scene: SceneState, notes: NoteCardModel[]): ProjectRevealPresentation {
  const project = getProjectById(scene.projects, scene.projectReveal.activeProjectId);
  if (!project) {
    return {
      project: null,
      memberNotes: [],
      backgroundNotes: notes,
      memberNoteIds: [],
      backgroundNoteIds: notes.map((note) => note.id)
    };
  }

  const memberNotes = notes.filter((note) => note.projectIds.includes(project.id));
  const backgroundNotes = notes.filter((note) => !note.projectIds.includes(project.id));

  return {
    project,
    memberNotes,
    backgroundNotes,
    memberNoteIds: memberNotes.map((note) => note.id),
    backgroundNoteIds: backgroundNotes.map((note) => note.id)
  };
}
