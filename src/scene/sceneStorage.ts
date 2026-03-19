import { normalizeNote, now } from '../notes/noteModel';
import { normalizeProject } from '../projects/projectModel';
import { refreshInferredRelationships } from '../relationshipLogic';
import { AIInteractionMode, ActionSuggestion, AIPanelViewState, CaptureComposerState, ExpandedSecondarySurface, FocusMode, InsightTimelineEntry, Lens, Relationship, RelationshipType, SceneState, Workspace } from '../types';
import { createDemoScene } from '../data/demoScene';
import { normalizeWorkspace } from '../workspaces/workspaceModel';
import { normalizeLens } from './lens';

export const SCENE_KEY = 'atom-notes.scene.v9';

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
    draft: String(raw?.draft ?? ''),
    lastCreatedNoteId: typeof raw?.lastCreatedNoteId === 'string' ? raw.lastCreatedNoteId : null
  };
}

function normalizeExpandedSecondarySurface(
  raw: unknown,
  aiPanel: Partial<AIPanelViewState> | undefined,
  captureComposer: Partial<CaptureComposerState> | undefined,
  quickCaptureOpen: unknown
): ExpandedSecondarySurface {
  const legacyAIPanelState = (aiPanel as Partial<{ state: string }> | undefined)?.state;
  const legacyCaptureOpen = (captureComposer as Partial<{ open: boolean }> | undefined)?.open;
  if (raw === 'thinking' || raw === 'capture' || raw === 'none') return raw;
  if (legacyAIPanelState === 'open' || legacyAIPanelState === 'peek') return 'thinking';
  if (legacyCaptureOpen || quickCaptureOpen) return 'capture';
  return 'none';
}

function normalizeFocusMode(raw: Partial<FocusMode> | undefined): FocusMode {
  return {
    highlight: raw?.highlight !== false,
    isolate: Boolean(raw?.isolate)
  };
}

function normalizeInsightTimeline(raw: unknown): InsightTimelineEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const candidate = entry as Partial<InsightTimelineEntry>;
      const actions = Array.isArray(candidate.actions)
        ? candidate.actions
            .map((action, actionIndex) => {
              if (!action || typeof action !== 'object') return null;
              if ((action as { kind?: string }).kind === 'open' && typeof (action as { noteId?: unknown }).noteId === 'string') {
                return {
                  id: String((action as { id?: unknown }).id ?? `timeline-action-${index}-${actionIndex}`),
                  label: String((action as { label?: unknown }).label ?? 'Open'),
                  kind: 'open' as const,
                  noteId: String((action as { noteId?: unknown }).noteId)
                };
              }
              if ((action as { kind?: string }).kind === 'preview' && (action as { suggestion?: unknown }).suggestion && typeof (action as { suggestion?: unknown }).suggestion === 'object') {
                return {
                  id: String((action as { id?: unknown }).id ?? `timeline-action-${index}-${actionIndex}`),
                  label: String((action as { label?: unknown }).label ?? 'Apply'),
                  kind: 'preview' as const,
                  suggestion: (action as { suggestion: ActionSuggestion }).suggestion
                };
              }
              return null;
            })
            .filter(Boolean)
        : [];

      if (typeof candidate.noteId !== 'string' || typeof candidate.title !== 'string' || typeof candidate.detail !== 'string') return null;

      return {
        id: String(candidate.id ?? `timeline-${index}`),
        noteId: candidate.noteId,
        kind: candidate.kind === 'ai' || candidate.kind === 'action' ? candidate.kind : 'structural',
        title: candidate.title,
        detail: candidate.detail,
        createdAt: Number(candidate.createdAt ?? now()),
        actions: actions as InsightTimelineEntry['actions']
      } satisfies InsightTimelineEntry;
    })
    .filter((entry): entry is InsightTimelineEntry => Boolean(entry));
}

function normalizeAIPanel(raw: Partial<AIPanelViewState> | undefined): AIPanelViewState {
  const mode: AIInteractionMode = raw?.mode === 'explore' || raw?.mode === 'summarize' || raw?.mode === 'act' ? raw.mode : 'ask';
  return {
    mode,
    query: String(raw?.query ?? ''),
    response: raw?.response ?? null,
    transcript: Array.isArray(raw?.transcript) ? raw.transcript.map((entry, index) => ({
      id: String(entry?.id ?? `msg-${index}`),
      role: (entry?.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      mode: entry?.mode === 'explore' || entry?.mode === 'summarize' || entry?.mode === 'act' ? entry.mode : mode,
      content: String(entry?.content ?? ''),
      createdAt: Number(entry?.createdAt ?? now())
    })).filter((entry) => entry.content.trim()) : [],
    loading: false
  };
}

function isLegacyWelcomeScene(scene: Pick<SceneState, 'notes' | 'relationships' | 'projects' | 'workspaces'>) {
  return (
    scene.notes.length === 1 &&
    scene.relationships.length === 0 &&
    scene.projects.length === 0 &&
    scene.workspaces.length === 0 &&
    scene.notes[0]?.title === 'Welcome to Atom Notes' &&
    scene.notes[0]?.body === 'Drag this card around.'
  );
}

export function loadScene(): SceneState {
  const fallback = createDemoScene();

  const raw =
    localStorage.getItem(SCENE_KEY) ??
    localStorage.getItem('atom-notes.scene.v8') ??
    localStorage.getItem('atom-notes.scene.v7') ??
    localStorage.getItem('atom-notes.scene.v6') ??
    localStorage.getItem('atom-notes.scene.v5') ??
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
      quickCaptureOpen?: boolean;
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

    const normalizedScene = {
      notes: normalizedNotes,
      relationships: refreshInferredRelationships(normalizedNotes, normalizedRelationships as Relationship[], now()),
      projects: normalizedProjects,
      workspaces: normalizedWorkspaces,
      insightTimeline: normalizeInsightTimeline(parsed.insightTimeline),
      isDragging: false,
      activeNoteId,
      expandedSecondarySurface: normalizeExpandedSecondarySurface(parsed.expandedSecondarySurface, parsed.aiPanel, parsed.captureComposer, parsed.quickCaptureOpen),
      captureComposer: normalizeCaptureComposer(parsed.captureComposer),
      focusMode: normalizeFocusMode(parsed.focusMode),
      aiPanel: normalizeAIPanel(parsed.aiPanel),
      lastCtrlTapTs: Number(parsed.lastCtrlTapTs ?? 0),
      lens: requestedLens,
      canvasScrollLeft: Number(parsed.canvasScrollLeft ?? 0),
      canvasScrollTop: Number(parsed.canvasScrollTop ?? 0)
    } satisfies SceneState;

    return isLegacyWelcomeScene(normalizedScene) ? fallback : normalizedScene;
  } catch {
    return fallback;
  }
}

export function saveScene(scene: SceneState): void {
  localStorage.setItem(SCENE_KEY, JSON.stringify(scene));
}
