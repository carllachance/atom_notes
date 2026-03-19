import type { Dispatch, SetStateAction } from 'react';
import { useCallback } from 'react';
import {
  archiveNoteInScene,
  bringNoteToFrontInScene,
  closeActiveNoteInScene,
  deleteNoteInScene,
  openNoteInScene,
  setIsDraggingInScene,
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
import {
  createExplicitRelationshipInScene,
  createInlineLinkedNoteInScene,
  confirmRelationshipInScene,
  promoteNoteFragmentToTaskInScene,
  restoreRelationshipInScene,
  setTaskStateInScene,
  traverseToRelatedInScene,
  updateRelationshipInScene
} from '../relationships/relationshipActions';
import { createProjectAndAssignToNoteInScene, setNoteProjectsInScene } from '../projects/projectActions';
import { ProjectDraft } from '../projects/projectModel';
import { createWorkspaceAndAssignToNoteInScene, setNoteWorkspaceInScene } from '../workspaces/workspaceActions';
import { WorkspaceDraft } from '../workspaces/workspaceModel';
import { addAttachmentsToNoteInScene, markAttachmentFailedInScene, markAttachmentProcessedInScene, markAttachmentProcessingInScene, removeAttachmentFromNoteInScene, retryAttachmentProcessingInScene } from '../attachments/attachmentActions';

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

  const setIsDragging = useCallback((isDragging: boolean) => {
    if (isDragging) cancelHoverIntent();
    setScene((prev) => setIsDraggingInScene(prev, isDragging));
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

  const createInlineLinkedNote = useCallback((sourceNoteId: string, title: string, type: RelationshipType) => {
    let targetNoteId: string | null = null;
    setScene((prev) => {
      const next = createInlineLinkedNoteInScene(prev, sourceNoteId, title, type);
      targetNoteId = next.targetNoteId;
      return next.scene;
    });
    return targetNoteId;
  }, [setScene]);

  const confirmRelationship = useCallback((relationshipId: string) => {
    setScene((prev) => confirmRelationshipInScene(prev, relationshipId));
  }, [setScene]);

  const promoteNoteFragmentToTask = useCallback((sourceNoteId: string, selection: { start: number; end: number; text: string }) => {
    let result: { taskNoteId: string | null; promotionId: string | null } = { taskNoteId: null, promotionId: null };
    setScene((prev) => {
      const next = promoteNoteFragmentToTaskInScene(prev, sourceNoteId, selection);
      result = { taskNoteId: next.taskNoteId, promotionId: next.promotionId };
      return next.scene;
    });
    return result;
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

  const setTaskState = useCallback((noteId: string, taskState: 'open' | 'done') => {
    setScene((prev) => setTaskStateInScene(prev, noteId, taskState));
  }, [setScene]);

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

  const addAttachments = useCallback((noteId: string, attachments: Parameters<typeof addAttachmentsToNoteInScene>[2]) => {
    setScene((prev) => addAttachmentsToNoteInScene(prev, noteId, attachments));
  }, [setScene]);

  const removeAttachment = useCallback((noteId: string, attachmentId: string) => {
    setScene((prev) => removeAttachmentFromNoteInScene(prev, noteId, attachmentId));
  }, [setScene]);

  const markAttachmentProcessing = useCallback((noteId: string, attachmentId: string) => {
    setScene((prev) => markAttachmentProcessingInScene(prev, noteId, attachmentId));
  }, [setScene]);

  const markAttachmentProcessed = useCallback((noteId: string, attachmentId: string, extraction: Parameters<typeof markAttachmentProcessedInScene>[3]) => {
    setScene((prev) => markAttachmentProcessedInScene(prev, noteId, attachmentId, extraction));
  }, [setScene]);

  const markAttachmentFailed = useCallback((noteId: string, attachmentId: string, error: string) => {
    setScene((prev) => markAttachmentFailedInScene(prev, noteId, attachmentId, error));
  }, [setScene]);

  const retryAttachmentProcessing = useCallback((noteId: string, attachmentId: string) => {
    setScene((prev) => retryAttachmentProcessingInScene(prev, noteId, attachmentId));
  }, [setScene]);

  return {
    closeActiveNote,
    updateNote,
    deleteNote,
    bringToFront,
    setIsDragging,
    setLens,
    setFocusMode,
    setCaptureComposer,
    setAIPanel,
    setAIPanelVisibility,
    createExplicitRelationship,
    createInlineLinkedNote,
    confirmRelationship,
    promoteNoteFragmentToTask,
    updateRelationship,
    restoreRelationship,
    traverseToRelated,
    setTaskState,
    onCanvasScroll,
    onOpenNote,
    onArchiveNote,
    toggleNoteFocus,
    setNoteProjects,
    createProjectForNote,
    setNoteWorkspace,
    createWorkspaceForNote,
    addAttachments,
    removeAttachment,
    markAttachmentProcessing,
    markAttachmentProcessed,
    markAttachmentFailed,
    retryAttachmentProcessing
  };
}
