import { useCallback, useEffect, useMemo, useState } from 'react';
import { createNote, now } from '../notes/noteModel';
import { getCompactDisplayTitle } from '../noteText';
import { getRankedRelationshipsForNote, getRelationshipTargetNoteId, refreshInferredRelationships } from '../relationshipLogic';
import {
  confirmRelationshipInScene,
  createExplicitRelationshipInScene,
  traverseToRelatedInScene
} from '../relationships/relationshipActions';
import {
  archiveNoteInScene,
  bringNoteToFrontInScene,
  closeActiveNoteInScene,
  openNoteInScene,
  restoreNoteInScene,
  setCanvasScrollInScene,
  setViewInScene,
  toggleNoteFocusInScene,
  updateNoteInScene
} from './sceneActions';
import { loadScene, saveScene } from './sceneStorage';
import { RelationshipType, SceneState, WorkspaceView } from '../types';

const CTRL_DOUBLE_TAP_MS = 320;

export function useSceneController() {
  const [scene, setScene] = useState<SceneState>(loadScene);
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | RelationshipType>('all');
  const [recentlyClosedNoteId, setRecentlyClosedNoteId] = useState<string | null>(null);
  const [showFocusedOnly, setShowFocusedOnly] = useState(false);
  const [, setTraceClock] = useState(0);

  const activeNote = useMemo(
    () => scene.notes.find((note) => note.id === scene.activeNoteId) ?? null,
    [scene.activeNoteId, scene.notes]
  );

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
        heuristicSupported: relationship.heuristicSupported
      };
    });
  }, [activeNote, activeRelationships, scene.notes]);

  const activeNotes = scene.notes.filter((note) => !note.archived && (!showFocusedOnly || note.inFocus));
  const archivedNotes = scene.notes.filter((note) => note.archived);
  const highestZ = scene.notes.reduce((acc, note) => Math.max(acc, note.z), 0);

  useEffect(() => {
    saveScene(scene);
  }, [scene]);

  useEffect(() => {
    const timer = window.setInterval(() => setTraceClock((tick) => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!recentlyClosedNoteId) return;
    const timer = window.setTimeout(() => setRecentlyClosedNoteId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [recentlyClosedNoteId]);

  const closeActiveNote = useCallback(() => {
    setRelationshipFilter('all');
    setScene((prev) => {
      if (prev.activeNoteId) setRecentlyClosedNoteId(prev.activeNoteId);
      return closeActiveNoteInScene(prev);
    });
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
        closeActiveNote();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeActiveNote, scene.lastCtrlTapTs]);

  const updateNote = useCallback((id: string, updates: Parameters<typeof updateNoteInScene>[2], trace?: string) => {
    setScene((prev) => updateNoteInScene(prev, id, updates, trace));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setScene((prev) => bringNoteToFrontInScene(prev, id));
  }, []);

  const setView = useCallback((view: WorkspaceView) => {
    setScene((prev) => setViewInScene(prev, view));
  }, []);

  const createExplicitRelationship = useCallback((fromId: string, toId: string, type: RelationshipType) => {
    setScene((prev) => createExplicitRelationshipInScene(prev, fromId, toId, type));
  }, []);

  const confirmRelationship = useCallback((relationshipId: string) => {
    setScene((prev) => confirmRelationshipInScene(prev, relationshipId));
  }, []);

  const traverseToRelated = useCallback((targetNoteId: string, relationshipId: string) => {
    setScene((prev) => traverseToRelatedInScene(prev, targetNoteId, relationshipId));
  }, []);

  const toggleQuickCapture = useCallback(() => {
    setScene((prev) => ({ ...prev, quickCaptureOpen: !prev.quickCaptureOpen }));
  }, []);

  const onCanvasScroll = useCallback((left: number, top: number) => {
    setScene((prev) => setCanvasScrollInScene(prev, left, top));
  }, []);

  const onOpenNote = useCallback(
    (id: string) => {
      setRecentlyClosedNoteId(null);
      setScene((prev) => openNoteInScene(prev, id));
      updateNote(id, {}, 'focused');
    },
    [updateNote]
  );

  const onRestoreNote = useCallback(
    (id: string) => {
      setScene((prev) => restoreNoteInScene(prev, id, highestZ));
    },
    [highestZ]
  );

  const onArchiveNote = useCallback((id: string) => {
    setRecentlyClosedNoteId(id);
    setScene((prev) => archiveNoteInScene(prev, id));
  }, []);


  const toggleNoteFocus = useCallback((id: string) => {
    setScene((prev) => toggleNoteFocusInScene(prev, id));
  }, []);

  const toggleFocusedOnly = useCallback(() => {
    setShowFocusedOnly((prev) => !prev);
  }, []);

  const onCapture = useCallback(
    (text: string) => {
      setScene((prev) => {
        const notes = [...prev.notes, createNote(text, highestZ + 1)];
        return {
          ...prev,
          notes,
          relationships: refreshInferredRelationships(notes, prev.relationships, now())
        };
      });
    },
    [highestZ]
  );

  return {
    scene,
    activeNote,
    activeNotes,
    archivedNotes,
    relationshipFilter,
    recentlyClosedNoteId,
    showFocusedOnly,
    rankedRelationships,
    relationshipPanelItems,
    relationshipTotals,
    setRelationshipFilter,
    closeActiveNote,
    updateNote,
    bringToFront,
    setView,
    createExplicitRelationship,
    confirmRelationship,
    traverseToRelated,
    toggleNoteFocus,
    toggleFocusedOnly,
    toggleQuickCapture,
    onCanvasScroll,
    onOpenNote,
    onRestoreNote,
    onArchiveNote,
    onCapture
  };
}
