import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import { createNote, now } from '../notes/noteModel';
import { refreshInferredRelationships } from '../relationshipLogic';
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
  setCanvasScrollInScene,
  setLensInScene,
  toggleNoteFocusInScene,
  updateNoteInScene
} from './sceneActions';
import { Lens, RelationshipType, SceneState } from '../types';

type UseSceneMutationsOptions = {
  setScene: Dispatch<SetStateAction<SceneState>>;
  highestZ: number;
  cancelHoverIntent: () => void;
  onActiveNoteClosed: (activeNoteId: string | null) => void;
  onNoteOpened: (id: string) => void;
  onNoteArchived: (id: string) => void;
  onNoteTraversed: (targetNoteId: string) => void;
  setRelationshipFilter: (filter: 'all' | RelationshipType) => void;
};

export function useSceneMutations({
  setScene,
  highestZ,
  cancelHoverIntent,
  onActiveNoteClosed,
  onNoteOpened,
  onNoteArchived,
  onNoteTraversed,
  setRelationshipFilter
}: UseSceneMutationsOptions) {
  const closeActiveNote = useCallback(() => {
    setRelationshipFilter('all');
    setScene((prev) => {
      onActiveNoteClosed(prev.activeNoteId);
      return closeActiveNoteInScene(prev);
    });
  }, [onActiveNoteClosed, setRelationshipFilter, setScene]);

  const updateNote = useCallback((id: string, updates: Parameters<typeof updateNoteInScene>[2], trace?: string) => {
    setScene((prev) => updateNoteInScene(prev, id, updates, trace));
  }, [setScene]);

  const bringToFront = useCallback(
    (id: string) => {
      cancelHoverIntent();
      setScene((prev) => bringNoteToFrontInScene(prev, id));
    },
    [cancelHoverIntent, setScene]
  );

  const setLens = useCallback(
    (lens: Lens) => {
      cancelHoverIntent();
      setScene((prev) => setLensInScene(prev, lens));
    },
    [cancelHoverIntent, setScene]
  );

  const createExplicitRelationship = useCallback((fromId: string, toId: string, type: RelationshipType) => {
    setScene((prev) => createExplicitRelationshipInScene(prev, fromId, toId, type));
  }, [setScene]);

  const confirmRelationship = useCallback((relationshipId: string) => {
    setScene((prev) => confirmRelationshipInScene(prev, relationshipId));
  }, [setScene]);

  const traverseToRelated = useCallback(
    (targetNoteId: string, relationshipId: string) => {
      onNoteTraversed(targetNoteId);
      setScene((prev) => traverseToRelatedInScene(prev, targetNoteId, relationshipId));
    },
    [onNoteTraversed, setScene]
  );

  const toggleQuickCapture = useCallback(() => {
    setScene((prev) => ({ ...prev, quickCaptureOpen: !prev.quickCaptureOpen }));
  }, [setScene]);

  const onCanvasScroll = useCallback((left: number, top: number) => {
    setScene((prev) => setCanvasScrollInScene(prev, left, top));
  }, [setScene]);

  const onOpenNote = useCallback(
    (id: string) => {
      cancelHoverIntent();
      onNoteOpened(id);
      setScene((prev) => openNoteInScene(prev, id));
      updateNote(id, {}, 'focused');
    },
    [cancelHoverIntent, onNoteOpened, setScene, updateNote]
  );

  const onArchiveNote = useCallback(
    (id: string) => {
      onNoteArchived(id);
      setScene((prev) => archiveNoteInScene(prev, id));
    },
    [onNoteArchived, setScene]
  );

  const toggleNoteFocus = useCallback((id: string) => {
    setScene((prev) => toggleNoteFocusInScene(prev, id));
  }, [setScene]);

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
    [highestZ, setScene]
  );

  return {
    closeActiveNote,
    updateNote,
    bringToFront,
    setLens,
    createExplicitRelationship,
    confirmRelationship,
    traverseToRelated,
    toggleQuickCapture,
    onCanvasScroll,
    onOpenNote,
    onArchiveNote,
    toggleNoteFocus,
    onCapture
  };
}
