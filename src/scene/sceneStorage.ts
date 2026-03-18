import { createNote, normalizeNote, now } from '../notes/noteModel';
import { normalizeProject } from '../projects/projectModel';
import { refreshInferredRelationships } from '../relationshipLogic';
import { ProjectModel, Relationship, SceneState } from '../types';

export const SCENE_KEY = 'atom-notes.scene.v2';

export function normalizeRelationship(raw: Partial<Relationship>): Relationship | null {
  if (!raw.fromId || !raw.toId) return null;

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    fromId: String(raw.fromId),
    toId: String(raw.toId),
    type: raw.type === 'references' ? 'references' : 'related_concept',
    state: raw.state === 'confirmed' ? 'confirmed' : 'proposed',
    explicitness: raw.explicitness === 'explicit' ? 'explicit' : 'inferred',
    confidence: Number(raw.confidence ?? 0.5),
    explanation: String(raw.explanation ?? ''),
    heuristicSupported: raw.heuristicSupported !== false,
    createdAt: Number(raw.createdAt ?? now()),
    lastActiveAt: Number(raw.lastActiveAt ?? now())
  };
}

function collectProjectMembershipProjects(notes: ReturnType<typeof normalizeNote>[], rawProjects: ProjectModel[]) {
  const projects = [...rawProjects];
  const knownIds = new Set(projects.map((project) => project.id));

  notes.forEach((note) => {
    note.projectIds.forEach((projectId) => {
      if (knownIds.has(projectId)) return;
      const inferredProject = normalizeProject({ id: projectId, name: projectId }, projects.length);
      projects.push(inferredProject);
      knownIds.add(projectId);
    });
  });

  return projects;
}

export function loadScene(): SceneState {
  const fallback: SceneState = {
    notes: [createNote('Welcome to Atom Notes\nDrag this card around.', 1)],
    relationships: [],
    projects: [],
    projectReveal: { activeProjectId: null },
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    lens: 'all',
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };

  const raw = localStorage.getItem(SCENE_KEY) ?? localStorage.getItem('atom-notes.scene.v1');
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<SceneState> & { currentView?: 'canvas' | 'archive' };
    const normalizedNotes = Array.isArray(parsed.notes)
      ? parsed.notes.map((note, i) => normalizeNote(note, i))
      : fallback.notes;

    const normalizedProjectsBase = Array.isArray(parsed.projects)
      ? parsed.projects.map((project, index) => normalizeProject(project, index))
      : [];
    const normalizedProjects = collectProjectMembershipProjects(normalizedNotes, normalizedProjectsBase);

    const normalizedRelationships = Array.isArray(parsed.relationships)
      ? parsed.relationships.map((item) => normalizeRelationship(item)).filter(Boolean)
      : [];

    const requestedLens =
      parsed.lens === 'focus' || parsed.lens === 'archive'
        ? parsed.lens
        : parsed.currentView === 'archive'
          ? 'archive'
          : 'all';
    const activeNoteId =
      typeof parsed.activeNoteId === 'string' && normalizedNotes.some((note) => note.id === parsed.activeNoteId)
        ? parsed.activeNoteId
        : null;
    const activeProjectId =
      typeof parsed.projectReveal?.activeProjectId === 'string' &&
      normalizedProjects.some((project) => project.id === parsed.projectReveal?.activeProjectId)
        ? parsed.projectReveal.activeProjectId
        : null;

    return {
      notes: normalizedNotes,
      relationships: refreshInferredRelationships(normalizedNotes, normalizedRelationships as Relationship[], now()),
      projects: normalizedProjects,
      projectReveal: { activeProjectId },
      activeNoteId,
      quickCaptureOpen: Boolean(parsed.quickCaptureOpen),
      lastCtrlTapTs: Number(parsed.lastCtrlTapTs ?? 0),
      lens: requestedLens,
      canvasScrollLeft: Number(parsed.canvasScrollLeft ?? 0),
      canvasScrollTop: Number(parsed.canvasScrollTop ?? 0)
    };
  } catch {
    return fallback;
  }
}

export function saveScene(scene: SceneState): void {
  localStorage.setItem(SCENE_KEY, JSON.stringify(scene));
}
