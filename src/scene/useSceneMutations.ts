import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import {
  archiveNoteInScene,
  bringNoteToFrontInScene,
  closeActiveNoteInScene,
  deleteNoteInScene,
  openNoteInScene,
  setAIPanelPayload,
  setAIPanelState,
  setCanvasScrollInScene,
  setCaptureComposerState,
  setFocusModeInScene,
  setLensInScene,
  toggleNoteFocusInScene,
  updateNoteInScene
} from './sceneActions';
import { Lens, RelationshipType, SceneState } from '../types';
import { createExplicitRelationshipInScene, confirmRelationshipInScene, restoreRelationshipInScene, traverseToRelatedInScene, updateRelationshipInScene } from '../relationships/relationshipActions';
import { createProjectAndAssignToNoteInScene, setNoteProjectsInScene } from '../projects/projectActions';
import { ProjectDraft } from '../projects/projectModel';
import { createWorkspaceAndAssignToNoteInScene, setNoteWorkspaceInScene } from '../workspaces/workspaceActions';
import { WorkspaceDraft } from '../workspaces/workspaceModel';

type UseSceneMutationsOptions = {
  setScene: Dispatch<SetStateAction<SceneState>>;
  cancelHoverIntent: () => void;
  onActiveNoteClosed: (activeNoteId: string | null) => void;
  onNoteOpened: (id: string) => void;
  onNoteArchived: (id: string) => void;
  onNoteTraversed: (targetNoteId: string) => void;
  setRelationshipFilter: (filter: 'all' | RelationshipType) => void;
};

export function useSceneMutations({
  setScene,
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

  const deleteNote = useCallback((id: string) => {
    setScene((prev) => deleteNoteInScene(prev, id));
  }, [setScene]);

  const bringToFront = useCallback((id: string) => {
    cancelHoverIntent();
    setScene((prev) => bringNoteToFrontInScene(prev, id));
  }, [cancelHoverIntent, setScene]);

  const setLens = useCallback((lens: Lens) => {
    cancelHoverIntent();
    setScene((prev) => setLensInScene(prev, lens));
  }, [cancelHoverIntent, setScene]);

  const setFocusMode = useCallback((updates: Partial<SceneState['focusMode']>) => {
    setScene((prev) => setFocusModeInScene(prev, updates));
  }, [setScene]);

  const setCaptureComposer = useCallback((updates: Partial<SceneState['captureComposer']>) => {
    setScene((prev) => setCaptureComposerState(prev, updates));
  }, [setScene]);

  const setAIPanel = useCallback((updates: Partial<SceneState['aiPanel']>) => {
    setScene((prev) => setAIPanelPayload(prev, updates));
  }, [setScene]);

  const setAIPanelVisibility = useCallback((state: SceneState['aiPanel']['state']) => {
    setScene((prev) => setAIPanelState(prev, state));
  }, [setScene]);

  const createExplicitRelationship = useCallback((fromId: string, toId: string, type: RelationshipType) => {
    setScene((prev) => createExplicitRelationshipInScene(prev, fromId, toId, type));
  }, [setScene]);

  const confirmRelationship = useCallback((relationshipId: string) => {
    setScene((prev) => confirmRelationshipInScene(prev, relationshipId));
  }, [setScene]);

  const updateRelationship = useCallback((relationshipId: string, type: RelationshipType, fromId: string, toId: string) => {
    setScene((prev) => updateRelationshipInScene(prev, relationshipId, type, fromId, toId));
  }, [setScene]);

  const restoreRelationship = useCallback((relationship: SceneState['relationships'][number]) => {
    setScene((prev) => restoreRelationshipInScene(prev, relationship));
  }, [setScene]);

  const traverseToRelated = useCallback((targetNoteId: string, relationshipId: string) => {
    onNoteTraversed(targetNoteId);
    setScene((prev) => traverseToRelatedInScene(prev, targetNoteId, relationshipId));
  }, [onNoteTraversed, setScene]);

  const onCanvasScroll = useCallback((left: number, top: number) => {
    setScene((prev) => setCanvasScrollInScene(prev, left, top));
  }, [setScene]);

  const onOpenNote = useCallback((id: string) => {
    cancelHoverIntent();
    onNoteOpened(id);
    setScene((prev) => openNoteInScene(prev, id));
    updateNote(id, {}, 'focused');
  }, [cancelHoverIntent, onNoteOpened, setScene, updateNote]);

  const onArchiveNote = useCallback((id: string) => {
    onNoteArchived(id);
    setScene((prev) => archiveNoteInScene(prev, id));
  }, [onNoteArchived, setScene]);

  const toggleNoteFocus = useCallback((id: string) => {
    setScene((prev) => toggleNoteFocusInScene(prev, id));
  }, [setScene]);

  const setNoteProjects = useCallback((id: string, projectIds: string[]) => {
    setScene((prev) => setNoteProjectsInScene(prev, id, projectIds));
  }, [setScene]);

  const createProjectForNote = useCallback((id: string, draft: ProjectDraft) => {
    setScene((prev) => createProjectAndAssignToNoteInScene(prev, id, draft));
  }, [setScene]);

  const setNoteWorkspace = useCallback((id: string, workspaceId: string | null) => {
    setScene((prev) => setNoteWorkspaceInScene(prev, id, workspaceId));
  }, [setScene]);

  const createWorkspaceForNote = useCallback((id: string, draft: WorkspaceDraft) => {
    setScene((prev) => createWorkspaceAndAssignToNoteInScene(prev, id, draft));
  }, [setScene]);

  return {
    closeActiveNote,
    updateNote,
    deleteNote,
    bringToFront,
    setLens,
    setFocusMode,
    setCaptureComposer,
    setAIPanel,
    setAIPanelVisibility,
    createExplicitRelationship,
    confirmRelationship,
    updateRelationship,
    restoreRelationship,
    traverseToRelated,
    onCanvasScroll,
    onOpenNote,
    onArchiveNote,
    toggleNoteFocus,
    setNoteProjects,
    createProjectForNote,
    setNoteWorkspace,
    createWorkspaceForNote
  };
}
