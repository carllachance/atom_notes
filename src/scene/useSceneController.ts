import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inferNoteMetadata } from '../ai/inference';
import { runConnectedInsights } from '../ai/connectedInsights';
import { createNote, now } from '../notes/noteModel';
import { getCompactDisplayTitle } from '../noteText';
import { getProjectsForNote } from '../projects/projectSelectors';
import { getRankedRelationshipsForNote, getRelationshipTargetNoteId, refreshInferredRelationships } from '../relationshipLogic';
import { ActionSuggestion, AIInteractionMode, Relationship, RelationshipType, SceneState } from '../types';
import { getWorkspaceForNote } from '../workspaces/workspaceSelectors';
import { loadScene, saveScene } from './sceneStorage';
import { getLensPresentation } from './lens';
import { resolveCapturePlacement } from './capturePlacement';
import { useAmbientGuidance } from './useAmbientGuidance';
import { useSceneMutations } from './useSceneMutations';

const CTRL_DOUBLE_TAP_MS = 320;
const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 170;

function getNoteCenter(note: { x: number; y: number }) {
  return { x: note.x + NOTE_WIDTH / 2, y: note.y + NOTE_HEIGHT / 2 };
}

export function useSceneController() {
  const [scene, setScene] = useState<SceneState>(loadScene);
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | RelationshipType>('all');
  const [, setTraceClock] = useState(0);
  const [activeRevealMatchIndex, setActiveRevealMatchIndex] = useState(0);
  const [viewportCenter, setViewportCenter] = useState({ x: 540, y: 360 });
  const [highlightedNoteIds, setHighlightedNoteIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<ActionSuggestion | null>(null);
  const [inspectedRelationshipId, setInspectedRelationshipId] = useState<string | null>(null);
  const [lastRelationshipEdit, setLastRelationshipEdit] = useState<{ before: Relationship; afterId: string } | null>(null);

  const liveLensPresentation = useMemo(() => getLensPresentation(scene), [scene]);
  const stableLensPresentationRef = useRef(liveLensPresentation);
  if (!scene.isDragging) {
    stableLensPresentationRef.current = liveLensPresentation;
  }
  const lensPresentation = scene.isDragging ? stableLensPresentationRef.current : liveLensPresentation;
  const focusFilteredVisibleNotes = useMemo(() => {
    const notes = lensPresentation.visibleNotes;
    return scene.focusMode.isolate ? notes.filter((note) => Boolean(note.isFocus ?? note.inFocus)) : notes;
  }, [lensPresentation.visibleNotes, scene.focusMode.isolate]);

  const activeNote = useMemo(() => scene.notes.find((note) => note.id === scene.activeNoteId) ?? null, [scene.activeNoteId, scene.notes]);
  const visibleNotes = focusFilteredVisibleNotes;
  const archivedNotes = lensPresentation.archivedNotes;
  const highestZ = scene.notes.reduce((acc, note) => Math.max(acc, note.z), 0);
  const visibleNoteIds = useMemo(() => new Set(visibleNotes.map((note) => note.id)), [visibleNotes]);
  const focusCount = useMemo(() => scene.notes.filter((note) => !note.archived && Boolean(note.isFocus ?? note.inFocus)).length, [scene.notes]);
  const activeNoteProjects = useMemo(() => (activeNote ? getProjectsForNote(scene, activeNote.id) : []), [activeNote, scene]);
  const activeWorkspace = useMemo(() => (activeNote ? getWorkspaceForNote(scene, activeNote.id) : null), [activeNote, scene]);

  const activeRelationships = useMemo(() => {
    if (!activeNote) return [];
    return scene.relationships.filter((relationship) => relationship.fromId === activeNote.id || relationship.toId === activeNote.id);
  }, [activeNote, scene.relationships]);

  const relationshipTotals = useMemo(() => {
    const totals: Record<RelationshipType, number> = {
      related: 0,
      references: 0,
      depends_on: 0,
      supports: 0,
      contradicts: 0,
      part_of: 0,
      leads_to: 0,
      derived_from: 0
    };
    for (const relationship of activeRelationships) totals[relationship.type] += 1;
    return totals;
  }, [activeRelationships]);

  const liveRankedRelationships = useMemo(() => (activeNote ? getRankedRelationshipsForNote(activeNote.id, scene) : []), [activeNote, scene]);
  const stableRankedRelationshipsRef = useRef(liveRankedRelationships);
  if (!scene.isDragging) {
    stableRankedRelationshipsRef.current = liveRankedRelationships;
  }
  const rankedRelationships = scene.isDragging ? stableRankedRelationshipsRef.current : liveRankedRelationships;

  const relationshipPanelItems = useMemo(() => {
    if (!activeNote) return [];
    const notesById = new Map(scene.notes.map((note) => [note.id, note]));

    return activeRelationships.map((relationship) => {
      const targetId = getRelationshipTargetNoteId(relationship, activeNote.id);
      return {
        id: relationship.id,
        targetId,
        targetTitle: notesById.get(targetId)
          ? getCompactDisplayTitle(notesById.get(targetId) as { title: string | null; body: string })
          : getCompactDisplayTitle({ title: null, body: '' }),
        type: relationship.type,
        explicitness: relationship.explicitness,
        state: relationship.state,
        explanation: relationship.explanation,
        heuristicSupported: relationship.heuristicSupported,
        fromId: relationship.fromId,
        toId: relationship.toId,
        directional: relationship.directional
      };
    });
  }, [activeNote, activeRelationships, scene.notes]);

  const inspectedRelationship = useMemo(
    () => scene.relationships.find((relationship) => relationship.id === inspectedRelationshipId) ?? null,
    [inspectedRelationshipId, scene.relationships]
  );

  const ambient = useAmbientGuidance({ visibleNotes, visibleNoteIds, relationships: scene.relationships, allNotes: scene.notes });

  const mutations = useSceneMutations({
    setScene,
    cancelHoverIntent: ambient.cancelHoverIntent,
    onActiveNoteClosed: ambient.onActiveNoteClosed,
    onNoteOpened: ambient.onNoteOpened,
    onNoteArchived: ambient.onNoteArchived,
    onNoteTraversed: ambient.onNoteTraversed,
    setRelationshipFilter
  });

  useEffect(() => {
    saveScene(scene);
  }, [scene]);

  useEffect(() => {
    const timer = window.setInterval(() => setTraceClock((tick) => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setActiveRevealMatchIndex((index) => (lensPresentation.revealMatchIds.length === 0 ? 0 : index % lensPresentation.revealMatchIds.length));
  }, [lensPresentation.revealMatchIds]);

  useEffect(() => {
    if (!activeNote) {
      setInspectedRelationshipId(null);
      return;
    }

    if (
      inspectedRelationshipId &&
      !scene.relationships.some(
        (relationship) =>
          relationship.id === inspectedRelationshipId && (relationship.fromId === activeNote.id || relationship.toId === activeNote.id)
      )
    ) {
      setInspectedRelationshipId(null);
    }
  }, [activeNote, inspectedRelationshipId, scene.relationships]);

  const runAsyncInference = useCallback((noteId: string) => {
    const note = scene.notes.find((candidate) => candidate.id === noteId);
    if (!note) return;
    window.setTimeout(async () => {
      const metadata = await inferNoteMetadata(note, scene.notes, scene.projects);
      setScene((prev) => ({
        ...prev,
        notes: prev.notes.map((candidate) =>
          candidate.id === noteId ? { ...candidate, ...metadata, updatedAt: candidate.updatedAt } : candidate
        )
      }));
    }, 0);
  }, [scene.notes, scene.projects]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        const t = now();
        if (t - scene.lastCtrlTapTs <= CTRL_DOUBLE_TAP_MS) {
          setScene((prev) => ({
            ...prev,
            quickCaptureOpen: !prev.captureComposer.open,
            captureComposer: { ...prev.captureComposer, open: !prev.captureComposer.open },
            lastCtrlTapTs: 0
          }));
        } else {
          setScene((prev) => ({ ...prev, lastCtrlTapTs: t }));
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === '.') {
        event.preventDefault();
        mutations.setAIPanelVisibility(scene.aiPanel.state === 'open' ? 'peek' : 'open');
      }

      if (event.key === 'Escape') {
        if (scene.captureComposer.open && !scene.captureComposer.draft.trim()) {
          mutations.setCaptureComposer({ open: false, draft: '' });
          return;
        }
        mutations.closeActiveNote();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mutations, scene.aiPanel.state, scene.captureComposer.draft, scene.captureComposer.open, scene.lastCtrlTapTs]);

  const visibleRevealMatchIds = lensPresentation.revealMatchIds.filter((noteId) => visibleNoteIds.has(noteId));
  const revealActiveNoteId = visibleRevealMatchIds.length > 0 ? visibleRevealMatchIds[activeRevealMatchIndex % visibleRevealMatchIds.length] : null;
  const revealMatchedNoteIds = [...new Set([...visibleRevealMatchIds, ...highlightedNoteIds])];

  const onViewportCenterChange = useCallback((x: number, y: number) => {
    setViewportCenter({ x, y });
    ambient.onViewportCenterChange(x, y);
  }, [ambient]);

  const onRevealQueryChange = useCallback((query: string) => {
    setScene((prev) => {
      const projectId = prev.lens.kind === 'project' || prev.lens.kind === 'reveal' ? prev.lens.projectId ?? null : null;
      const workspaceId = prev.lens.kind === 'workspace' || prev.lens.kind === 'reveal' ? prev.lens.workspaceId ?? null : null;
      const mode = prev.lens.kind === 'project' || prev.lens.kind === 'workspace' || prev.lens.kind === 'reveal' ? prev.lens.mode : 'context';
      return {
        ...prev,
        lens: query.trim() ? { kind: 'reveal', query, projectId, workspaceId, mode } : { kind: 'universe' }
      };
    });
  }, []);

  const onReveal = useCallback(() => {
    if (visibleRevealMatchIds.length === 0) return;
    const matchNotes = visibleNotes.filter((note) => visibleRevealMatchIds.includes(note.id));
    const centers = matchNotes.map((note) => getNoteCenter(note));
    const minX = Math.min(...centers.map((point) => point.x));
    const maxX = Math.max(...centers.map((point) => point.x));
    const minY = Math.min(...centers.map((point) => point.y));
    const maxY = Math.max(...centers.map((point) => point.y));
    ambient.panToCenterIfFar({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
  }, [ambient, visibleNotes, visibleRevealMatchIds]);

  const stepReveal = useCallback((direction: -1 | 1) => {
    if (visibleRevealMatchIds.length < 2) return;
    const nextIndex = (activeRevealMatchIndex + direction + visibleRevealMatchIds.length) % visibleRevealMatchIds.length;
    const nextId = visibleRevealMatchIds[nextIndex];
    const targetNote = visibleNotes.find((note) => note.id === nextId);
    if (targetNote) ambient.panToCenterIfFar(getNoteCenter(targetNote));
    setActiveRevealMatchIndex(nextIndex);
  }, [activeRevealMatchIndex, ambient, visibleNotes, visibleRevealMatchIds]);

  const onCaptureDraftChange = useCallback((draft: string) => {
    mutations.setCaptureComposer({ open: true, draft });
  }, [mutations]);

  const commitCapture = useCallback(() => {
    const draft = scene.captureComposer.draft;
    if (!draft.trim()) return;
    const inheritedProjectIds = scene.lens.kind === 'project' && scene.lens.projectId ? [scene.lens.projectId] : [];
    const inheritedWorkspaceId = scene.lens.kind === 'workspace' ? scene.lens.workspaceId : scene.lens.kind === 'reveal' ? scene.lens.workspaceId : null;
    const placement = resolveCapturePlacement(scene.notes, viewportCenter, activeNote, highestZ + 1);
    const createdNote = createNote(draft, highestZ + 1, inheritedProjectIds, inheritedWorkspaceId, placement);

    setScene((prev) => {
      const notes = [...prev.notes, createdNote];
      return {
        ...prev,
        notes,
        relationships: refreshInferredRelationships(notes, prev.relationships, now()),
        activeNoteId: createdNote.id,
        quickCaptureOpen: false,
        captureComposer: { open: false, draft: '', lastCreatedNoteId: createdNote.id }
      };
    });

    setHighlightedNoteIds([createdNote.id]);
    runAsyncInference(createdNote.id);
  }, [scene.captureComposer.draft, scene.lens, scene.notes, viewportCenter, activeNote, highestZ, runAsyncInference]);

  const cancelCapture = useCallback(() => {
    if (scene.captureComposer.draft.trim()) return;
    mutations.setCaptureComposer({ open: false, draft: '' });
  }, [mutations, scene.captureComposer.draft]);

  const undoLastCapture = useCallback(() => {
    const lastId = scene.captureComposer.lastCreatedNoteId;
    if (!lastId) return;
    mutations.deleteNote(lastId);
    mutations.setCaptureComposer({ lastCreatedNoteId: null, open: false, draft: '' });
  }, [mutations, scene.captureComposer.lastCreatedNoteId]);

  const inspectRelationship = useCallback((relationshipId: string) => {
    setInspectedRelationshipId(relationshipId);
  }, []);

  const closeRelationshipInspector = useCallback(() => {
    setInspectedRelationshipId(null);
  }, []);

  const updateRelationship = useCallback((relationshipId: string, type: RelationshipType, fromId: string, toId: string) => {
    const previous = scene.relationships.find((relationship) => relationship.id === relationshipId);
    if (!previous) return;

    mutations.updateRelationship(relationshipId, type, fromId, toId);
    setLastRelationshipEdit({ before: previous, afterId: relationshipId });
    setInspectedRelationshipId(relationshipId);
  }, [mutations, scene.relationships]);

  const undoRelationshipEdit = useCallback(() => {
    if (!lastRelationshipEdit) return;
    mutations.restoreRelationship(lastRelationshipEdit.before);
    setInspectedRelationshipId(lastRelationshipEdit.before.id);
    setLastRelationshipEdit(null);
  }, [lastRelationshipEdit, mutations]);

  const openAIReference = useCallback((noteId: string) => {
    setHighlightedNoteIds([noteId]);
    mutations.onOpenNote(noteId);
  }, [mutations]);

  const runInsights = useCallback(async () => {
    const query = scene.aiPanel.query.trim();
    if (!query) return;

    const userEntry = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      mode: scene.aiPanel.mode,
      content: query,
      createdAt: now()
    };

    mutations.setAIPanel({
      loading: true,
      state: 'open',
      transcript: [...scene.aiPanel.transcript, userEntry]
    });

    const response = await runConnectedInsights(scene, {
      query,
      selectedNoteId: scene.activeNoteId ?? undefined,
      visibleNoteIds: visibleNotes.map((note) => note.id),
      activeProjectIds: lensPresentation.activeProject ? [lensPresentation.activeProject.id] : [],
      recentNoteIds: scene.captureComposer.lastCreatedNoteId ? [scene.captureComposer.lastCreatedNoteId] : [],
      mode: scene.aiPanel.mode
    });

    const assistantEntry = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      mode: scene.aiPanel.mode,
      content: response.answer,
      createdAt: now()
    };

    mutations.setAIPanel({
      loading: false,
      response,
      query: '',
      state: 'open',
      transcript: [...scene.aiPanel.transcript, userEntry, assistantEntry]
    });
  }, [lensPresentation.activeProject, mutations, scene, visibleNotes]);

  const confirmPendingAction = useCallback(() => {
    if (!pendingAction) return;
    if (pendingAction.kind === 'highlight_nodes') {
      setHighlightedNoteIds(pendingAction.noteIds ?? []);
    }
    if (pendingAction.kind === 'focus_cluster') {
      for (const noteId of pendingAction.noteIds ?? []) mutations.updateNote(noteId, { isFocus: true }, 'focused');
    }
    if (pendingAction.kind === 'open_note' && pendingAction.noteId) {
      openAIReference(pendingAction.noteId);
    }
    if (pendingAction.kind === 'create_summary') {
      const related = scene.notes.filter((note) => (pendingAction.noteIds ?? []).includes(note.id));
      const summary = ['Summary', ...related.map((note) => `- ${note.title ?? note.body.slice(0, 42)}`)].join('\n');
      mutations.setCaptureComposer({ open: true, draft: summary });
    }
    setPendingAction(null);
  }, [mutations, openAIReference, pendingAction, scene.notes]);

  return {
    scene,
    activeNote,
    activeNoteProjects,
    activeWorkspace,
    visibleNotes,
    archivedNotes,
    projects: scene.projects,
    workspaces: scene.workspaces,
    lensPresentation,
    focusCount,
    highlightedNoteIds,
    hoveredNoteId: ambient.hoveredNoteId,
    relationshipFilter,
    inspectedRelationship,
    canUndoRelationshipEdit: Boolean(lastRelationshipEdit),
    recentlyClosedNoteId: ambient.recentlyClosedNoteId,
    rankedRelationships,
    relationshipPanelItems,
    relationshipTotals,
    ambientRelatedNoteIds: ambient.ambientRelatedNoteIds,
    ambientGlowLevel: ambient.ambientGlowLevel,
    pulseNoteId: ambient.pulseNoteId,
    isDragging: scene.isDragging,
    recenterTarget: scene.isDragging ? null : ambient.recenterTarget,
    revealState: { query: scene.lens.kind === 'reveal' ? scene.lens.query : '', matchedNoteIds: lensPresentation.revealMatchIds, activeMatchIndex: activeRevealMatchIndex },
    visibleRevealMatchIds: revealMatchedNoteIds,
    revealActiveNoteId,
    pendingAction,
    setPendingAction,
    setRelationshipFilter,
    inspectRelationship,
    closeRelationshipInspector,
    closeActiveNote: mutations.closeActiveNote,
    updateNote: mutations.updateNote,
    bringToFront: mutations.bringToFront,
    setIsDragging: mutations.setIsDragging,
    setLens: mutations.setLens,
    setFocusMode: mutations.setFocusMode,
    setAIPanel: mutations.setAIPanel,
    setAIPanelVisibility: mutations.setAIPanelVisibility,
    createExplicitRelationship: mutations.createExplicitRelationship,
    confirmRelationship: mutations.confirmRelationship,
    updateRelationship,
    undoRelationshipEdit,
    traverseToRelated: mutations.traverseToRelated,
    toggleNoteFocus: mutations.toggleNoteFocus,
    setNoteProjects: mutations.setNoteProjects,
    createProjectForNote: mutations.createProjectForNote,
    setNoteWorkspace: mutations.setNoteWorkspace,
    createWorkspaceForNote: mutations.createWorkspaceForNote,
    onCanvasScroll: mutations.onCanvasScroll,
    onViewportCenterChange,
    onOpenNote: mutations.onOpenNote,
    onArchiveNote: mutations.onArchiveNote,
    onHoverStart: ambient.onHoverStart,
    onHoverEnd: ambient.onHoverEnd,
    onWhereWasI: ambient.onWhereWasI,
    onRevealQueryChange,
    onReveal,
    onRevealNext: () => stepReveal(1),
    onRevealPrev: () => stepReveal(-1),
    onCaptureDraftChange,
    commitCapture,
    cancelCapture,
    undoLastCapture,
    openAIReference,
    runInsights,
    confirmPendingAction,
    cancelPendingAction: () => setPendingAction(null)
  };
}
