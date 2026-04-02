import { normalizeNote, now } from '../notes/noteModel';
import { normalizeProject } from '../projects/projectModel';
import { refreshInferredRelationships } from '../relationshipLogic';
import { AIInteractionMode, ActionSuggestion, AIPanelViewState, CaptureComposerState, ExpandedSecondarySurface, FocusMode, InsightTimelineEntry, Lens, Relationship, RelationshipType, SceneState, Workspace } from '../types';
import { createEmptyStudySupportState, OnboardingProfile, StudyInteraction, StudySupportBlock } from '../learning/studyModel';
import { isStarterLensId, sanitizeStarterLenses } from '../learning/lensPresets';
import { createDemoScene } from '../data/demoScene';
import { normalizeWorkspace } from '../workspaces/workspaceModel';
import { normalizeLens } from './lens';
import { loadStudyPersistence, saveStudyPersistence } from '../learning/studyPersistence';
import { normalizeArtifact, normalizeButlerItem, normalizeExecutionLog, normalizeMemoryPreference, normalizeWorkflowPlan } from '../butler/butlerModel';

export const SCENE_KEY = 'atom-notes.scene.v10';
export const SCENE_MODE_KEY = 'atom-notes.scene-mode.v1';
export type SceneStoreMode = 'sample' | 'blank';

function getSceneStorageKey(mode: SceneStoreMode) {
  return mode === 'sample' ? SCENE_KEY : `${SCENE_KEY}.${mode}`;
}

function createEmptyScene(): SceneState {
  return {
    onboardingProfile: null,
    studySupportBlocks: {},
    studyInteractions: {},
    notes: [],
    relationships: [],
    projects: [],
    workspaces: [],
    libraryItems: [],
    researchSourceSets: [],
    insightTimeline: [],
    butlerItems: [],
    workflowPlans: [],
    artifacts: [],
    executionLogs: [],
    memoryPreferences: [],
    isDragging: false,
    activeNoteId: null,
    expandedSecondarySurface: 'none',
    captureComposer: { draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: {
      mode: 'ask',
      query: '',
      response: null,
      transcript: [],
      loading: false,
      communicationState: 'idle',
      interactionMode: 'live-stream'
    },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

export function getSceneStoreMode(): SceneStoreMode {
  const raw = localStorage.getItem(SCENE_MODE_KEY);
  return raw === 'blank' ? 'blank' : 'sample';
}

export function setSceneStoreMode(mode: SceneStoreMode): void {
  localStorage.setItem(SCENE_MODE_KEY, mode);
}

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
      createdAt: Number(entry?.createdAt ?? now()),
      contentSource: entry?.contentSource ?? (entry?.role === 'assistant' ? 'ai-generated' : 'user-authored')
    })).filter((entry) => entry.content.trim()) : [],
    loading: false,
    communicationState: raw?.communicationState ?? 'idle',
    interactionMode: raw?.interactionMode ?? 'live-stream'
  };
}


function normalizeOnboardingProfile(raw: unknown): OnboardingProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<OnboardingProfile>;
  if (!candidate.ageRange || !candidate.primaryUseCase) return null;
  const starterLenses = sanitizeStarterLenses(candidate.starterLenses);
  const activeLensId = isStarterLensId(candidate.activeLensId)
    ? candidate.activeLensId
    : starterLenses[0] ?? 'study';
  return {
    ageRange: candidate.ageRange,
    primaryUseCase: candidate.primaryUseCase,
    selectedPresetId: candidate.selectedPresetId ?? 'mixed_starter',
    starterLenses,
    activeLensId,
    configuredAt: Number(candidate.configuredAt ?? now())
  };
}

function normalizeStudyBlocks(raw: unknown): Record<string, StudySupportBlock[]> {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, StudySupportBlock[]>;
  return Object.fromEntries(Object.entries(input).map(([noteId, blocks]) => [
    noteId,
    Array.isArray(blocks)
      ? blocks
          .filter((block) => block && typeof block === 'object')
          .map((block) => {
            const citations = Array.isArray(block.provenance?.citations) ? block.provenance.citations : [];
            const content = block.content?.kind === 'review_recommendation'
              ? { ...block.content, schedule: Array.isArray(block.content.schedule) ? block.content.schedule : [] }
              : block.content;
            return {
              ...block,
              noteId,
              content,
              provenance: {
                generator: block.provenance?.generator === 'model' ? 'model' : 'heuristic',
                modelId: String(block.provenance?.modelId ?? 'atom-notes-local-heuristic-v1'),
                generatedAt: Number(block.provenance?.generatedAt ?? block.createdAt ?? now()),
                explanation: String(block.provenance?.explanation ?? 'Generated from note content.'),
                citations
              }
            };
          })
      : []
  ]));
}

function normalizeStudyInteractions(raw: unknown): Record<string, StudyInteraction[]> {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, StudyInteraction[]>;
  return Object.fromEntries(Object.entries(input).map(([noteId, interactions]) => [
    noteId,
    Array.isArray(interactions) ? interactions.filter((entry) => entry && typeof entry === 'object').map((entry) => ({ ...entry, noteId })) : []
  ]));
}


function latestBlockTimestamp(blocks: StudySupportBlock[] | undefined): number {
  return Math.max(0, ...((blocks ?? []).map((block) => Number(block.createdAt ?? 0))));
}

function latestInteractionTimestamp(interactions: StudyInteraction[] | undefined): number {
  return Math.max(0, ...((interactions ?? []).map((entry) => Number(entry.createdAt ?? 0))));
}

function mergeStudyBlocksByRecency(
  sceneBlocks: Record<string, StudySupportBlock[]>,
  durableBlocks: Record<string, StudySupportBlock[]>
): Record<string, StudySupportBlock[]> {
  const noteIds = new Set([...Object.keys(sceneBlocks), ...Object.keys(durableBlocks)]);
  return Object.fromEntries([...noteIds].map((noteId) => {
    const sceneEntries = sceneBlocks[noteId] ?? [];
    const durableEntries = durableBlocks[noteId] ?? [];
    if (!sceneEntries.length) return [noteId, durableEntries];
    if (!durableEntries.length) return [noteId, sceneEntries];
    return [noteId, latestBlockTimestamp(sceneEntries) >= latestBlockTimestamp(durableEntries) ? sceneEntries : durableEntries];
  }));
}

function mergeStudyInteractionsByRecency(
  sceneInteractions: Record<string, StudyInteraction[]>,
  durableInteractions: Record<string, StudyInteraction[]>
): Record<string, StudyInteraction[]> {
  const noteIds = new Set([...Object.keys(sceneInteractions), ...Object.keys(durableInteractions)]);
  return Object.fromEntries([...noteIds].map((noteId) => {
    const sceneEntries = sceneInteractions[noteId] ?? [];
    const durableEntries = durableInteractions[noteId] ?? [];
    if (!sceneEntries.length) return [noteId, durableEntries];
    if (!durableEntries.length) return [noteId, sceneEntries];
    return [noteId, latestInteractionTimestamp(sceneEntries) >= latestInteractionTimestamp(durableEntries) ? sceneEntries : durableEntries];
  }));
}

function resolveOnboardingProfilePrecedence(sceneProfile: OnboardingProfile | null, durableProfile: OnboardingProfile | null): OnboardingProfile | null {
  if (!sceneProfile) return durableProfile;
  if (!durableProfile) return sceneProfile;
  return Number(sceneProfile.configuredAt ?? 0) >= Number(durableProfile.configuredAt ?? 0) ? sceneProfile : durableProfile;
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

export function loadSceneForMode(mode: SceneStoreMode): SceneState {
  const fallback = mode === 'blank' ? createEmptyScene() : createDemoScene();
  const durableStudyState = loadStudyPersistence('local-user');

  const raw =
    localStorage.getItem(getSceneStorageKey(mode)) ??
    (mode === 'sample'
      ? (
        localStorage.getItem('atom-notes.scene.v9') ??
        localStorage.getItem('atom-notes.scene.v8') ??
        localStorage.getItem('atom-notes.scene.v7') ??
        localStorage.getItem('atom-notes.scene.v6') ??
        localStorage.getItem('atom-notes.scene.v5') ??
        localStorage.getItem('atom-notes.scene.v4') ??
        localStorage.getItem('atom-notes.scene.v3') ??
        localStorage.getItem('atom-notes.scene.v2') ??
        localStorage.getItem('atom-notes.scene.v1')
      )
      : null);
  if (!raw) {
    const durableOnboardingProfile = normalizeOnboardingProfile(durableStudyState?.onboardingProfile ?? null);
    const fallbackStudy = createEmptyStudySupportState();
    const durableStudyBlocks = normalizeStudyBlocks(durableStudyState?.blocksByNoteId ?? fallbackStudy.blocksByNoteId);
    const durableStudyInteractions = normalizeStudyInteractions(durableStudyState?.interactionsByNoteId ?? fallbackStudy.interactionsByNoteId);
    return {
      ...fallback,
      onboardingProfile: resolveOnboardingProfilePrecedence(fallback.onboardingProfile ?? null, durableOnboardingProfile),
      studySupportBlocks: mergeStudyBlocksByRecency(normalizeStudyBlocks(fallback.studySupportBlocks ?? {}), durableStudyBlocks),
      studyInteractions: mergeStudyInteractionsByRecency(normalizeStudyInteractions(fallback.studyInteractions ?? {}), durableStudyInteractions)
    };
  }

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
          const nextWorkspaceIds = (normalized.workspaceIds ?? []).filter((workspaceId) => workspaceIds.has(workspaceId));
          return {
            ...normalized,
            projectIds: normalized.projectIds.filter((projectId) => projectIds.has(projectId)),
            inferredProjectIds: (normalized.inferredProjectIds ?? []).filter((projectId) => projectIds.has(projectId)),
            workspaceIds: nextWorkspaceIds,
            inferredWorkspaceIds: (normalized.inferredWorkspaceIds ?? []).filter((workspaceId) => workspaceIds.has(workspaceId)),
            workspaceId: nextWorkspaceIds[0] ?? null
          };
        })
      : fallback.notes;

    const normalizedRelationships = Array.isArray(parsed.relationships)
      ? parsed.relationships.map((item) => normalizeRelationship(item)).filter(Boolean)
      : [];

    const requestedLens = normalizeLensState(parsed.lens ?? parsed);
    const activeNoteId = typeof parsed.activeNoteId === 'string' && normalizedNotes.some((note) => note.id === parsed.activeNoteId && !note.deleted && !note.archived)
      ? parsed.activeNoteId
      : null;
    const restoredSecondarySurface = normalizeExpandedSecondarySurface(parsed.expandedSecondarySurface, parsed.aiPanel, parsed.captureComposer, parsed.quickCaptureOpen);

    const normalizedStudy = createEmptyStudySupportState();
    const sceneOnboardingProfile = normalizeOnboardingProfile(parsed.onboardingProfile);
    const durableOnboardingProfile = normalizeOnboardingProfile(durableStudyState?.onboardingProfile ?? null);
    const sceneStudyBlocks = normalizeStudyBlocks(parsed.studySupportBlocks ?? normalizedStudy.blocksByNoteId);
    const durableStudyBlocks = normalizeStudyBlocks(durableStudyState?.blocksByNoteId ?? normalizedStudy.blocksByNoteId);
    const sceneStudyInteractions = normalizeStudyInteractions(parsed.studyInteractions ?? normalizedStudy.interactionsByNoteId);
    const durableStudyInteractions = normalizeStudyInteractions(durableStudyState?.interactionsByNoteId ?? normalizedStudy.interactionsByNoteId);

    const normalizedScene = {
      onboardingProfile: resolveOnboardingProfilePrecedence(sceneOnboardingProfile, durableOnboardingProfile),
      studySupportBlocks: mergeStudyBlocksByRecency(sceneStudyBlocks, durableStudyBlocks),
      studyInteractions: mergeStudyInteractionsByRecency(sceneStudyInteractions, durableStudyInteractions),
      notes: normalizedNotes,
      relationships: refreshInferredRelationships(normalizedNotes, normalizedRelationships as Relationship[], now()),
      projects: normalizedProjects,
      workspaces: normalizedWorkspaces,
      libraryItems: Array.isArray(parsed.libraryItems) ? parsed.libraryItems : [],
      researchSourceSets: Array.isArray(parsed.researchSourceSets) ? parsed.researchSourceSets : [],
      insightTimeline: normalizeInsightTimeline(parsed.insightTimeline),
      butlerItems: Array.isArray(parsed.butlerItems) ? parsed.butlerItems.map((item, index) => normalizeButlerItem(item, index)) : fallback.butlerItems ?? [],
      workflowPlans: Array.isArray(parsed.workflowPlans) ? parsed.workflowPlans.map((plan, index) => normalizeWorkflowPlan(plan, index)) : fallback.workflowPlans ?? [],
      artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts.map((artifact, index) => normalizeArtifact(artifact, index)) : fallback.artifacts ?? [],
      executionLogs: Array.isArray(parsed.executionLogs) ? parsed.executionLogs.map((log, index) => normalizeExecutionLog(log, index)) : fallback.executionLogs ?? [],
      memoryPreferences: Array.isArray(parsed.memoryPreferences) ? parsed.memoryPreferences.map((memory, index) => normalizeMemoryPreference(memory, index)) : fallback.memoryPreferences ?? [],
      isDragging: false,
      activeNoteId,
      expandedSecondarySurface: activeNoteId && restoredSecondarySurface === 'capture' ? 'none' : restoredSecondarySurface,
      captureComposer: normalizeCaptureComposer(parsed.captureComposer),
      focusMode: normalizeFocusMode(parsed.focusMode),
      aiPanel: normalizeAIPanel(parsed.aiPanel),
      lastCtrlTapTs: Number(parsed.lastCtrlTapTs ?? 0),
      lens: requestedLens,
      canvasScrollLeft: Number(parsed.canvasScrollLeft ?? 0),
      canvasScrollTop: Number(parsed.canvasScrollTop ?? 0)
    } satisfies SceneState;

    return mode === 'sample' && isLegacyWelcomeScene(normalizedScene) ? fallback : normalizedScene;
  } catch {
    const durableOnboardingProfile = normalizeOnboardingProfile(durableStudyState?.onboardingProfile ?? null);
    const fallbackStudy = createEmptyStudySupportState();
    const durableStudyBlocks = normalizeStudyBlocks(durableStudyState?.blocksByNoteId ?? fallbackStudy.blocksByNoteId);
    const durableStudyInteractions = normalizeStudyInteractions(durableStudyState?.interactionsByNoteId ?? fallbackStudy.interactionsByNoteId);
    return {
      ...fallback,
      onboardingProfile: resolveOnboardingProfilePrecedence(fallback.onboardingProfile ?? null, durableOnboardingProfile),
      studySupportBlocks: mergeStudyBlocksByRecency(normalizeStudyBlocks(fallback.studySupportBlocks ?? {}), durableStudyBlocks),
      studyInteractions: mergeStudyInteractionsByRecency(normalizeStudyInteractions(fallback.studyInteractions ?? {}), durableStudyInteractions)
    };
  }
}

export function loadScene(): SceneState {
  return loadSceneForMode(getSceneStoreMode());
}

export function saveSceneForMode(scene: SceneState, mode: SceneStoreMode): void {
  localStorage.setItem(getSceneStorageKey(mode), JSON.stringify(scene));
  saveStudyPersistence('local-user', {
    onboardingProfile: scene.onboardingProfile ?? null,
    blocksByNoteId: scene.studySupportBlocks ?? {},
    interactionsByNoteId: scene.studyInteractions ?? {}
  });
}

export function saveScene(scene: SceneState): void {
  saveSceneForMode(scene, getSceneStoreMode());
}
