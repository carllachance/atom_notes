import { createNote, normalizeNote, now } from '../notes/noteModel';
import { normalizeProject } from '../projects/projectModel';
import { refreshInferredRelationships } from '../relationshipLogic';
import { Project, ProjectRevealState, Relationship, SceneState } from '../types';

export const SCENE_KEY = 'atom-notes.scene.v3';

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

function normalizeProjectRevealState(raw: Partial<ProjectRevealState> | undefined, projects: Project[]): ProjectRevealState {
  const validProjectIds = new Set(projects.map((project) => project.id));
  const activeProjectId =
    typeof raw?.activeProjectId === 'string' && validProjectIds.has(raw.activeProjectId) ? raw.activeProjectId : null;

  return {
    activeProjectId,
    isolate: Boolean(raw?.isolate)
  };
}

export function loadScene(): SceneState {
  const fallback: SceneState = {
    notes: [createNote('Welcome to Atom Notes\nDrag this card around.', 1)],
    relationships: [],
    projects: [],
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    lens: 'all',
    canvasScrollLeft: 0,
    canvasScrollTop: 0,
    projectReveal: {
      activeProjectId: null,
      isolate: false
    }
  };

  const raw =
    localStorage.getItem(SCENE_KEY) ??
    localStorage.getItem('atom-notes.scene.v2') ??
    localStorage.getItem('atom-notes.scene.v1');
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<SceneState> & { currentView?: 'canvas' | 'archive' };
    const normalizedProjects: Project[] = Array.isArray(parsed.projects)
      ? parsed.projects
          .map((project, index) => normalizeProject(project, index))
          .filter((project): project is Project => Boolean(project))
      : [];
    const projectIds = new Set(normalizedProjects.map((project) => project.id));
    const normalizedNotes = Array.isArray(parsed.notes)
      ? parsed.notes.map((note, i) => {
          const normalized = normalizeNote(note, i);
          return {
            ...normalized,
            projectIds: normalized.projectIds.filter((projectId) => projectIds.has(projectId))
          };
        })
      : fallback.notes;

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

    return {
      notes: normalizedNotes,
      relationships: refreshInferredRelationships(normalizedNotes, normalizedRelationships as Relationship[], now()),
      projects: normalizedProjects,
      activeNoteId,
      quickCaptureOpen: Boolean(parsed.quickCaptureOpen),
      lastCtrlTapTs: Number(parsed.lastCtrlTapTs ?? 0),
      lens: requestedLens,
      canvasScrollLeft: Number(parsed.canvasScrollLeft ?? 0),
      canvasScrollTop: Number(parsed.canvasScrollTop ?? 0),
      projectReveal: normalizeProjectRevealState(parsed.projectReveal, normalizedProjects)
    };
  } catch {
    return fallback;
  }
}

export function saveScene(scene: SceneState): void {
  localStorage.setItem(SCENE_KEY, JSON.stringify(scene));
}
