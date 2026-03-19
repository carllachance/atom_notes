import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inferNoteMetadata } from '../ai/inference';
import { runConnectedInsights } from '../ai/connectedInsights';
import { appendInsightTimelineEntries, createAIInsightTimelineEntry } from '../insights/insightTimeline';
import { createNote, now } from '../notes/noteModel';
import { getCompactDisplayTitle } from '../noteText';
import { getProjectsForNote } from '../projects/projectSelectors';
import { getRankedRelationshipsForNote, getRelationshipTargetNoteId, refreshInferredRelationships } from '../relationshipLogic';
import { ActionSuggestion, AIInteractionMode, InsightsResponse, Relationship, RelationshipType, SceneState } from '../types';
import { getWorkspaceForNote } from '../workspaces/workspaceSelectors';
import { loadScene, saveScene } from './sceneStorage';
import { getLensPresentation } from './lens';
import { resolveCapturePlacement } from './capturePlacement';
import { useAmbientGuidance } from './useAmbientGuidance';
import { useSceneMutations } from './useSceneMutations';
import { createAttachmentFromFile, processAttachment } from '../attachments/attachmentProcessing';
import { handleCtrlTapInScene } from './sceneActions';

const CTRL_DOUBLE_TAP_MS = 320;
const NOTE_WIDTH = 270;
const NOTE_HEIGHT = 170;
const AI_STREAM_STEP_MS = 26;

function getNoteCenter(note: { x: number; y: number }) {
  return { x: note.x + NOTE_WIDTH / 2, y: note.y + NOTE_HEIGHT / 2 };
}

function makeEmptyInsightsResponse(response: InsightsResponse): InsightsResponse {
  return {
    ...response,
    answer: '',
    sections: response.sections.map((section) => ({ ...section, body: '' }))
  };
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
  const [streamingResponse, setStreamingResponse] = useState<InsightsResponse | null>(null);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [recentlyDeletedNoteId, setRecentlyDeletedNoteId] = useState<string | null>(null);
  const streamingTimerRef = useRef<number | null>(null);
  const processingAttachmentRef = useRef<string | null>(null);

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

  const activeNote = useMemo(
    () => scene.notes.find((note) => note.id === scene.activeNoteId && !note.deleted) ?? null,
    [scene.activeNoteId, scene.notes]
  );
  const visibleNotes = focusFilteredVisibleNotes;
  const archivedNotes = lensPresentation.archivedNotes;
  const deletedNotes = useMemo(
    () => scene.notes.filter((note) => note.deleted).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [scene.notes]
  );
  const highestZ = scene.notes.reduce((acc, note) => Math.max(acc, note.z), 0);
  const visibleNoteIds = useMemo(() => new Set(visibleNotes.map((note) => note.id)), [visibleNotes]);
  const focusCount = useMemo(() => scene.notes.filter((note) => !note.archived && Boolean(note.isFocus ?? note.inFocus)).length, [scene.notes]);
  const activeNoteProjects = useMemo(() => (activeNote ? getProjectsForNote(scene, activeNote.id) : []), [activeNote, scene]);
  const activeWorkspace = useMemo(() => (activeNote ? getWorkspaceForNote(scene, activeNote.id) : null), [activeNote, scene]);

  const activeRelationships = useMemo(() => {
    if (!activeNote) return [];
    const notesById = new Map(scene.notes.map((note) => [note.id, note]));
    return scene.relationships.filter((relationship) => {
      if (relationship.fromId !== activeNote.id && relationship.toId !== activeNote.id) return false;
      const targetId = relationship.fromId === activeNote.id ? relationship.toId : relationship.fromId;
      const target = notesById.get(targetId);
      return Boolean(target && !target.deleted && !target.archived);
    });
  }, [activeNote, scene.notes, scene.relationships]);

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

  const recallCue = useMemo(() => {
    if (activeNote || !ambient.recallNoteId) return null;
    const note = scene.notes.find((candidate) => candidate.id === ambient.recallNoteId);
    if (!note || note.archived) return null;
    const noteVisibleInScope = visibleNoteIds.has(note.id);
    return {
      noteId: note.id,
      noteTitle: getCompactDisplayTitle(note, 42),
      suggestedNextStep: noteVisibleInScope
        ? 'Re-open this note and continue from its last place in the canvas.'
        : 'Re-open this note and return to the thread you were in.'
    };
  }, [activeNote, ambient.recallNoteId, scene.notes, visibleNoteIds]);

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
    return () => {
      if (streamingTimerRef.current) window.clearTimeout(streamingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const pending = scene.notes.flatMap((note) =>
      (note.attachments ?? [])
        .filter((attachment) => attachment.processing.status === 'uploaded')
        .map((attachment) => ({ noteId: note.id, attachment }))
    )[0];

    if (!pending) {
      processingAttachmentRef.current = null;
      return;
    }

    const key = `${pending.noteId}:${pending.attachment.id}`;
    if (processingAttachmentRef.current === key) return;
    processingAttachmentRef.current = key;
    let cancelled = false;

    mutations.markAttachmentProcessing(pending.noteId, pending.attachment.id);
    void processAttachment(pending.attachment)
      .then((result) => {
        if (cancelled) return;
        mutations.markAttachmentProcessed(pending.noteId, pending.attachment.id, {
          method: result.method,
          extractedAt: now(),
          contentHash: result.contentHash,
          text: result.text,
          chunks: result.chunks
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Processing failed.';
        mutations.markAttachmentFailed(pending.noteId, pending.attachment.id, message);
      })
      .finally(() => {
        if (!cancelled) processingAttachmentRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [mutations, scene.notes]);

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
        setScene((prev) => handleCtrlTapInScene(prev, t, CTRL_DOUBLE_TAP_MS));
      }

      if ((event.ctrlKey || event.metaKey) && event.key === '.') {
        event.preventDefault();
        mutations.setAIPanelVisibility(scene.aiPanel.state === 'open' ? 'peek' : 'open');
      }

      if (event.key === 'Escape') {
        if (scene.captureComposer.open) {
          mutations.setCaptureComposer({ open: false });
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

  const advanceRecallCue = useCallback(() => {
    if (!recallCue) return;
    mutations.onOpenNote(recallCue.noteId);
    setHighlightedNoteIds([recallCue.noteId]);
    ambient.clearRecallCue();
  }, [ambient, mutations, recallCue]);

  const clearRecallCue = useCallback(() => {
    ambient.clearRecallCue();
  }, [ambient]);

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
    mutations.setCaptureComposer({ open: false });
  }, [mutations]);

  const undoLastCapture = useCallback(() => {
    const lastId = scene.captureComposer.lastCreatedNoteId;
    if (!lastId) return;
    mutations.deleteNote(lastId);
    setRecentlyDeletedNoteId(lastId);
    mutations.setCaptureComposer({ lastCreatedNoteId: null, open: false, draft: '' });
  }, [mutations, scene.captureComposer.lastCreatedNoteId]);

  const deleteActiveNote = useCallback((noteId: string) => {
    mutations.deleteNote(noteId);
    setRecentlyDeletedNoteId(noteId);
  }, [mutations]);

  const restoreDeletedNote = useCallback((noteId: string) => {
    mutations.restoreDeletedNote(noteId);
    setRecentlyDeletedNoteId((current) => (current === noteId ? null : current));
  }, [mutations]);

  const undoDelete = useCallback(() => {
    if (!recentlyDeletedNoteId) return;
    mutations.restoreDeletedNote(recentlyDeletedNoteId);
    setRecentlyDeletedNoteId(null);
  }, [mutations, recentlyDeletedNoteId]);

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

  const removeRelationship = useCallback((relationshipId: string) => {
    mutations.removeRelationship(relationshipId);
    setLastRelationshipEdit(null);
    setInspectedRelationshipId((current) => (current === relationshipId ? null : current));
  }, [mutations]);

  const openAIReference = useCallback((noteId: string) => {
    setHighlightedNoteIds([noteId]);
    mutations.onOpenNote(noteId);
  }, [mutations]);

  const appendTextToActiveNote = useCallback((content: string) => {
    if (!scene.activeNoteId) return;
    const current = scene.notes.find((note) => note.id === scene.activeNoteId);
    if (!current) return;
    const nextBody = [current.body.trim(), content.trim()].filter(Boolean).join('\n\n');
    mutations.updateNote(scene.activeNoteId, { body: nextBody }, 'refined');
  }, [mutations, scene.activeNoteId, scene.notes]);

  const pinInsightToNewNote = useCallback((content: string) => {
    const inheritedProjectIds = scene.lens.kind === 'project' && scene.lens.projectId ? [scene.lens.projectId] : [];
    const inheritedWorkspaceId = scene.lens.kind === 'workspace' ? scene.lens.workspaceId : scene.lens.kind === 'reveal' ? scene.lens.workspaceId : null;
    const placement = resolveCapturePlacement(scene.notes, viewportCenter, activeNote, highestZ + 1);
    const createdNote = createNote(content, highestZ + 1, inheritedProjectIds, inheritedWorkspaceId, placement);

    setScene((prev) => {
      const notes = [...prev.notes, createdNote];
      return {
        ...prev,
        notes,
        relationships: refreshInferredRelationships(notes, prev.relationships, now()),
        activeNoteId: createdNote.id
      };
    });

    setHighlightedNoteIds([createdNote.id]);
    runAsyncInference(createdNote.id);
  }, [activeNote, highestZ, runAsyncInference, scene.lens, scene.notes, viewportCenter]);

  const streamInsightsResponse = useCallback((response: InsightsResponse, onComplete: () => void) => {
    const answerParts = response.answer.split(/(\s+)/).filter(Boolean);
    const sectionParts = response.sections.map((section) => section.body.split(/(\s+)/).filter(Boolean));
    let answerIndex = 0;
    const sectionIndices = sectionParts.map(() => 0);

    if (streamingTimerRef.current) window.clearTimeout(streamingTimerRef.current);
    setStreamingResponse(makeEmptyInsightsResponse(response));
    setIsStreamingResponse(true);

    const tick = () => {
      if (answerIndex < answerParts.length) {
        answerIndex += 1;
      } else {
        const nextSectionIndex = sectionIndices.findIndex((count, index) => count < sectionParts[index].length);
        if (nextSectionIndex !== -1) sectionIndices[nextSectionIndex] += 1;
      }

      setStreamingResponse({
        ...response,
        answer: answerParts.slice(0, answerIndex).join(''),
        sections: response.sections.map((section, index) => ({
          ...section,
          body: sectionParts[index].slice(0, sectionIndices[index]).join('')
        }))
      });

      const done = answerIndex >= answerParts.length && sectionIndices.every((count, index) => count >= sectionParts[index].length);
      if (!done) {
        streamingTimerRef.current = window.setTimeout(tick, AI_STREAM_STEP_MS);
        return;
      }

      streamingTimerRef.current = null;
      setIsStreamingResponse(false);
      setStreamingResponse(null);
      onComplete();
    };

    streamingTimerRef.current = window.setTimeout(tick, AI_STREAM_STEP_MS);
  }, []);

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
      response: null,
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

    setHighlightedNoteIds(response.highlightNoteIds ?? response.references);

    streamInsightsResponse(response, () => {
      const assistantEntry = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        mode: scene.aiPanel.mode,
        content: response.answer,
        createdAt: now()
      };

      setScene((prev) => {
        const nextScene: SceneState = {
          ...prev,
          aiPanel: {
            ...prev.aiPanel,
            loading: false,
            response,
            query: '',
            state: 'open' as const,
            transcript: [...scene.aiPanel.transcript, userEntry, assistantEntry]
          }
        };
        const timelineEntry = prev.activeNoteId ? createAIInsightTimelineEntry(nextScene, prev.activeNoteId, response, scene.aiPanel.mode, query, assistantEntry.createdAt) : null;
        return timelineEntry ? appendInsightTimelineEntries(nextScene, [timelineEntry]) : nextScene;
      });
    });
  }, [lensPresentation.activeProject, mutations, scene, streamInsightsResponse, visibleNotes]);

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
    if (pendingAction.kind === 'append_to_note' && pendingAction.summary) {
      appendTextToActiveNote(pendingAction.summary);
    }
    if (pendingAction.kind === 'pin_to_note' && pendingAction.summary) {
      pinInsightToNewNote(pendingAction.summary);
    }
    if (pendingAction.kind === 'create_link' && pendingAction.relationships?.length) {
      for (const relationship of pendingAction.relationships) {
        mutations.createExplicitRelationship(relationship.fromId, relationship.toId, relationship.type);
      }
      setHighlightedNoteIds(pendingAction.relationships.flatMap((relationship) => [relationship.fromId, relationship.toId]));
    }
    setPendingAction(null);
  }, [appendTextToActiveNote, mutations, openAIReference, pendingAction, pinInsightToNewNote, scene.notes]);

  const addAttachmentsToActiveNote = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    if (!scene.activeNoteId) return;
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const prepared = await Promise.all(files.map((file) => createAttachmentFromFile(file)));
    mutations.addAttachments(scene.activeNoteId, prepared);
    event.target.value = '';
  }, [mutations, scene.activeNoteId]);

  const removeAttachment = useCallback((attachmentId: string) => {
    if (!scene.activeNoteId) return;
    mutations.removeAttachment(scene.activeNoteId, attachmentId);
  }, [mutations, scene.activeNoteId]);

  const retryAttachmentProcessing = useCallback((attachmentId: string) => {
    if (!scene.activeNoteId) return;
    mutations.retryAttachmentProcessing(scene.activeNoteId, attachmentId);
  }, [mutations, scene.activeNoteId]);

  return {
    scene,
    activeNote,
    activeNoteProjects,
    activeWorkspace,
    visibleNotes,
    archivedNotes,
    deletedNotes,
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
    recallCue,
    rankedRelationships,
    relationshipPanelItems,
    activeInsightTimeline: activeNote ? (scene.insightTimeline ?? []).filter((entry) => entry.noteId === activeNote.id) : [],
    streamingResponse,
    isStreamingResponse,
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
    createInlineLinkedNote: mutations.createInlineLinkedNote,
    confirmRelationship: mutations.confirmRelationship,
    promoteNoteFragmentToTask: mutations.promoteNoteFragmentToTask,
    setTaskState: mutations.setTaskState,
    updateRelationship,
    undoRelationshipEdit,
    removeRelationship,
    traverseToRelated: mutations.traverseToRelated,
    toggleNoteFocus: mutations.toggleNoteFocus,
    setNoteProjects: mutations.setNoteProjects,
    createProjectForNote: mutations.createProjectForNote,
    setNoteWorkspace: mutations.setNoteWorkspace,
    createWorkspaceForNote: mutations.createWorkspaceForNote,
    addAttachmentsToActiveNote,
    removeAttachment,
    retryAttachmentProcessing,
    onCanvasScroll: mutations.onCanvasScroll,
    onViewportCenterChange,
    onOpenNote: mutations.onOpenNote,
    onArchiveNote: mutations.onArchiveNote,
    restoreArchivedNote: mutations.restoreArchivedNote,
    onHoverStart: ambient.onHoverStart,
    onHoverEnd: ambient.onHoverEnd,
    onWhereWasI: ambient.onWhereWasI,
    onAdvanceRecallCue: advanceRecallCue,
    onClearRecallCue: clearRecallCue,
    onRevealQueryChange,
    onReveal,
    onRevealNext: () => stepReveal(1),
    onRevealPrev: () => stepReveal(-1),
    onCaptureDraftChange,
    commitCapture,
    cancelCapture,
    undoLastCapture,
    deleteActiveNote,
    restoreDeletedNote,
    undoDelete,
    recentlyDeletedNoteId,
    openAIReference,
    runInsights,
    confirmPendingAction,
    cancelPendingAction: () => setPendingAction(null)
  };
}
