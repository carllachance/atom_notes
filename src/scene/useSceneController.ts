import { useEffect, useMemo, useState } from 'react';
import { now } from '../notes/noteModel';
import { getCompactDisplayTitle } from '../noteText';
import { getRankedRelationshipsForNote, getRelationshipTargetNoteId } from '../relationshipLogic';
import { loadScene, saveScene } from './sceneStorage';
import {
  applyLens,
  createRelationshipLens,
  createRevealQueryLens,
  createWorkspaceLens,
  getLensProjectId,
  getLensRevealQuery,
  getLensWorkspaceId
} from './lens';
import { RelationshipType, SceneState } from '../types';
import { useAmbientGuidance } from './useAmbientGuidance';
import { useRevealController } from './useRevealController';
import { useSceneMutations } from './useSceneMutations';

const CTRL_DOUBLE_TAP_MS = 320;

export function useSceneController() {
  const [scene, setScene] = useState<SceneState>(loadScene);
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | RelationshipType>('all');
  const [, setTraceClock] = useState(0);

  const activeNote = useMemo(
    () => scene.notes.find((note) => note.id === scene.activeNoteId) ?? null,
    [scene.activeNoteId, scene.notes]
  );

  const lensState = useMemo(() => applyLens(scene), [scene]);
  const visibleNotes = lensState.visibleNotes;
  const archivedNotes = lensState.archivedNotes;
  const highestZ = scene.notes.reduce((acc, note) => Math.max(acc, note.z), 0);
  const visibleNoteIds = useMemo(() => new Set(visibleNotes.map((note) => note.id)), [visibleNotes]);
  const lensWorkspaceId = getLensWorkspaceId(scene.lens);
  const activeRevealQuery = getLensRevealQuery(scene.lens);
  const activeProjectId = getLensProjectId(scene.lens);

  const activeRelationships = useMemo(() => {
    if (!activeNote) return [];
    return scene.relationships.filter(
      (relationship) => relationship.fromId === activeNote.id || relationship.toId === activeNote.id
    );
  }, [activeNote, scene.relationships]);

  const relationshipTotals = useMemo(
    () => ({
      related: activeRelationships.filter((relationship) => relationship.type === 'related_concept').length,
      references: activeRelationships.filter((relationship) => relationship.type === 'references').length
    }),
    [activeRelationships]
  );

  const rankedRelationships = useMemo(() => {
    if (!activeNote) return [];
    return getRankedRelationshipsForNote(activeNote.id, scene);
  }, [activeNote, scene]);

  const relationshipLensState = useMemo(() => {
    if (!activeNote) return null;
    return applyLens(scene, createRelationshipLens(activeNote.id, lensWorkspaceId));
  }, [activeNote, lensWorkspaceId, scene]);

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
        targetContextLabel: relationshipLensState?.noteStates[targetId]?.contextLabel ?? 'Unscoped',
        type: relationship.type,
        explicitness: relationship.explicitness,
        state: relationship.state,
        explanation: relationship.explanation,
        heuristicSupported: relationship.heuristicSupported
      };
    });
  }, [activeNote, activeRelationships, relationshipLensState?.noteStates, scene.notes]);

  const ambient = useAmbientGuidance({
    visibleNotes,
    visibleNoteIds,
    relationships: scene.relationships,
    allNotes: scene.notes
  });

  const mutations = useSceneMutations({
    setScene,
    highestZ,
    cancelHoverIntent: ambient.cancelHoverIntent,
    onActiveNoteClosed: ambient.onActiveNoteClosed,
    onNoteOpened: ambient.onNoteOpened,
    onNoteArchived: ambient.onNoteArchived,
    onNoteTraversed: ambient.onNoteTraversed,
    setRelationshipFilter
  });

  const reveal = useRevealController({
    visibleNotes,
    activeRevealQuery,
    panToCenterIfFar: ambient.panToCenterIfFar,
    onApplyReveal: (query) => {
      mutations.setLens(query ? createRevealQueryLens(query, lensWorkspaceId) : createWorkspaceLens(lensWorkspaceId));
    }
  });

  useEffect(() => {
    saveScene(scene);
  }, [scene]);

  useEffect(() => {
    const timer = window.setInterval(() => setTraceClock((tick) => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        const t = now();
        if (t - scene.lastCtrlTapTs <= CTRL_DOUBLE_TAP_MS) {
          setScene((prev) => ({
            ...prev,
            quickCaptureOpen: !prev.quickCaptureOpen,
            lastCtrlTapTs: 0
          }));
        } else {
          setScene((prev) => ({ ...prev, lastCtrlTapTs: t }));
        }
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setScene((prev) => ({ ...prev, quickCaptureOpen: true }));
      }

      if (event.key === 'Escape') {
        mutations.closeActiveNote();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mutations.closeActiveNote, scene.lastCtrlTapTs]);

  return {
    scene,
    activeNote,
    visibleNotes,
    lensState,
    archivedNotes,
    activeProjectId,
    lensWorkspaceId,
    hoveredNoteId: ambient.hoveredNoteId,
    relationshipFilter,
    recentlyClosedNoteId: ambient.recentlyClosedNoteId,
    rankedRelationships,
    relationshipPanelItems,
    relationshipTotals,
    ambientRelatedNoteIds: ambient.ambientRelatedNoteIds,
    ambientGlowLevel: ambient.ambientGlowLevel,
    pulseNoteId: ambient.pulseNoteId,
    recenterTarget: ambient.recenterTarget,
    revealState: reveal.revealState,
    visibleRevealMatchIds: reveal.visibleRevealMatchIds,
    revealActiveNoteId: reveal.revealActiveNoteId,
    setRelationshipFilter,
    closeActiveNote: mutations.closeActiveNote,
    updateNote: mutations.updateNote,
    bringToFront: mutations.bringToFront,
    setLens: mutations.setLens,
    createExplicitRelationship: mutations.createExplicitRelationship,
    confirmRelationship: mutations.confirmRelationship,
    traverseToRelated: mutations.traverseToRelated,
    toggleNoteFocus: mutations.toggleNoteFocus,
    toggleQuickCapture: mutations.toggleQuickCapture,
    onCanvasScroll: mutations.onCanvasScroll,
    onViewportCenterChange: ambient.onViewportCenterChange,
    onOpenNote: mutations.onOpenNote,
    onArchiveNote: mutations.onArchiveNote,
    onCapture: mutations.onCapture,
    onHoverStart: ambient.onHoverStart,
    onHoverEnd: ambient.onHoverEnd,
    onWhereWasI: ambient.onWhereWasI,
    onRevealQueryChange: reveal.onRevealQueryChange,
    onReveal: reveal.onReveal,
    onRevealNext: reveal.onRevealNext,
    onRevealPrev: reveal.onRevealPrev
  };
}
