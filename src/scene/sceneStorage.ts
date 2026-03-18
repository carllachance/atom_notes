import { createNote, normalizeNote, now } from '../notes/noteModel';
import { normalizeProject } from '../projects/projectModel';
import { refreshInferredRelationships } from '../relationshipLogic';
import { AIInteractionMode, AIPanelViewState, CaptureComposerState, FocusMode, Lens, Relationship, RelationshipType, SceneState, Workspace } from '../types';
import { normalizeWorkspace } from '../workspaces/workspaceModel';
import { createDefaultLens, normalizeLens } from './lens';

export const SCENE_KEY = 'atom-notes.scene.v5';

function normalizeRelationshipType(raw: unknown): RelationshipType {
  switch (raw) {
    case 'references':
    case 'depends_on':
    case 'supports':
    case 'contradicts':
    case 'part_of':
    case 'leads_to':
    case 'derived_from':
    case 'related':
      return raw;
    case 'related_concept':
      return 'related';
    default:
      return 'related';
  }
}

export function normalizeRelationship(raw: Partial<Relationship>): Relationship | null {
  if (!raw.fromId || !raw.toId) return null;

  const type = normalizeRelationshipType(raw.type);
  const directional = typeof raw.directional === 'boolean'
    ? raw.directional
    : type !== 'related' && type !== 'contradicts';
  const explicitness = raw.explicitness === 'explicit' ? 'explicit' : 'inferred';

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    fromId: String(raw.fromId),
    toId: String(raw.toId),
    type,
    state: raw.state === 'confirmed' ? 'confirmed' : 'proposed',
    explicitness,
    directional,
    confidence: raw.confidence == null ? (type === 'related' ? 0.5 : 0.62) : Number(raw.confidence),
    isInferred: raw.isInferred ?? explicitness === 'inferred',
    explanation: String(raw.explanation ?? ''),
    heuristicSupported: raw.heuristicSupported !== false,
    createdAt: Number(raw.createdAt ?? now()),
    lastActiveAt: Number(raw.lastActiveAt ?? now())
  };
}

function normalizeLensState(raw: unknown): Lens {
  return normalizeLens(raw);
}

function normalizeCaptureComposer(raw: Partial<CaptureComposerState> | undefined): CaptureComposerState {
  return {
    open: Boolean(raw?.open),
    draft: String(raw?.draft ?? ''),
    lastCreatedNoteId: typeof raw?.lastCreatedNoteId === 'string' ? raw.lastCreatedNoteId : null
  };
}

function normalizeFocusMode(raw: Partial<FocusMode> | undefined): FocusMode {
  return {
    highlight: raw?.highlight !== false,
    isolate: Boolean(raw?.isolate)
  };
}

function normalizeAIPanel(raw: Partial<AIPanelViewState> | undefined): AIPanelViewState {
  const mode: AIInteractionMode = raw?.mode === 'explore' || raw?.mode === 'summarize' || raw?.mode === 'act' ? raw.mode : 'ask';
  const state = raw?.state === 'peek' || raw?.state === 'open' ? raw.state : 'hidden';
  return {
    state,
    mode,
    query: String(raw?.query ?? ''),
    response: raw?.response ?? null,
    loading: false
  };
}

export function loadScene(): SceneState {
  const fallback: SceneState = {
    notes: [createNote('Welcome to Atom Notes\nDrag this card around.', 1)],
    relationships: [],
    projects: [],
    workspaces: [],
    isDragging: false,
    activeNoteId: null,
    quickCaptureOpen: false,
    captureComposer: { open: true, draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { state: 'hidden', mode: 'ask', query: '', response: null, loading: false },
    lastCtrlTapTs: 0,
    lens: createDefaultLens(),
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };

  const raw =
    localStorage.getItem(SCENE_KEY) ??
    localStorage.getItem('atom-notes.scene.v4') ??
    localStorage.getItem('atom-notes.scene.v3') ??
    localStorage.getItem('atom-notes.scene.v2') ??
    localStorage.getItem('atom-notes.scene.v1');
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<SceneState> & {
      currentView?: 'canvas' | 'archive';
      workspaces?: Workspace[];
      projectReveal?: { activeProjectId?: string | null; isolate?: boolean };
    };
    const normalizedProjects = Array.isArray(parsed.projects)
      ? parsed.projects.map((project, index) => normalizeProject(project, index)).filter(Boolean) as SceneState['projects']
      : [];
    const projectIds = new Set(normalizedProjects.map((project) => project.id));
    const normalizedWorkspaces = Array.isArray(parsed.workspaces)
      ? parsed.workspaces.map((workspace, index) => normalizeWorkspace(workspace, index)).filter(Boolean) as Workspace[]
      : [];
    const workspaceIds = new Set(normalizedWorkspaces.map((workspace) => workspace.id));
    const normalizedNotes = Array.isArray(parsed.notes)
      ? parsed.notes.map((note, i) => {
          const normalized = normalizeNote(note, i);
          return {
            ...normalized,
            projectIds: normalized.projectIds.filter((projectId) => projectIds.has(projectId)),
            inferredProjectIds: (normalized.inferredProjectIds ?? []).filter((projectId) => projectIds.has(projectId)),
            workspaceId: normalized.workspaceId && workspaceIds.has(normalized.workspaceId) ? normalized.workspaceId : null
          };
        })
      : fallback.notes;

    const normalizedRelationships = Array.isArray(parsed.relationships)
      ? parsed.relationships.map((item) => normalizeRelationship(item)).filter(Boolean)
      : [];

    const requestedLens = normalizeLensState(parsed.lens ?? parsed);
    const activeNoteId = typeof parsed.activeNoteId === 'string' && normalizedNotes.some((note) => note.id === parsed.activeNoteId)
      ? parsed.activeNoteId
      : null;

    return {
      notes: normalizedNotes,
      relationships: refreshInferredRelationships(normalizedNotes, normalizedRelationships as Relationship[], now()),
      projects: normalizedProjects,
      workspaces: normalizedWorkspaces,
      isDragging: false,
      activeNoteId,
      quickCaptureOpen: Boolean(parsed.quickCaptureOpen),
      captureComposer: normalizeCaptureComposer(parsed.captureComposer),
      focusMode: normalizeFocusMode(parsed.focusMode),
      aiPanel: normalizeAIPanel(parsed.aiPanel),
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
