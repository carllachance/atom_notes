import { now } from '../notes/noteModel';
import { normalizeOptionalTitle } from '../noteText';
import { normalizeProjectIds } from '../projects/projectModel';
import { refreshInferredRelationships } from '../relationshipLogic';
import { ExpandedSecondarySurface, FocusMode, Lens, NoteCardModel, SceneState } from '../types';
import { createDefaultLens, normalizeLens } from './lens';

export function updateNoteInScene(
  scene: SceneState,
  id: string,
  updates: Partial<NoteCardModel>,
  trace?: string
): SceneState {
  const normalizedUpdates = {
    ...updates,
    ...('title' in updates ? { title: normalizeOptionalTitle((updates.title as string | null | undefined) ?? null) } : {}),
    ...('projectIds' in updates ? { projectIds: normalizeProjectIds(updates.projectIds) } : {}),
    ...('inferredProjectIds' in updates ? { inferredProjectIds: normalizeProjectIds(updates.inferredProjectIds) } : {}),
    ...('workspaceId' in updates ? { workspaceId: typeof updates.workspaceId === 'string' && updates.workspaceId.trim() ? updates.workspaceId : null } : {}),
    ...('isFocus' in updates ? { inFocus: Boolean(updates.isFocus), isFocus: Boolean(updates.isFocus) } : {}),
    ...('inFocus' in updates ? { inFocus: Boolean(updates.inFocus), isFocus: Boolean(updates.inFocus) } : {})
  };

  const notes = scene.notes.map((note) => {
    if (note.id !== id) return note;
    return { ...note, ...normalizedUpdates, trace: trace ?? normalizedUpdates.trace ?? note.trace, updatedAt: now() };
  });

  return { ...scene, notes, relationships: refreshInferredRelationships(notes, scene.relationships, now()) };
}

export function deleteNoteInScene(scene: SceneState, id: string): SceneState {
  const deletedAt = now();
  const notes = scene.notes.map((note) =>
    note.id === id
      ? {
          ...note,
          deleted: true,
          deletedAt,
          archived: false,
          trace: 'deleted',
          updatedAt: deletedAt
        }
      : note
  );
  return {
    ...scene,
    notes,
    relationships: refreshInferredRelationships(notes, scene.relationships, deletedAt),
    activeNoteId: scene.activeNoteId === id ? null : scene.activeNoteId,
    captureComposer: {
      ...scene.captureComposer,
      lastCreatedNoteId: scene.captureComposer.lastCreatedNoteId === id ? null : scene.captureComposer.lastCreatedNoteId
    }
  };
}

export function restoreDeletedNoteInScene(scene: SceneState, id: string, highestZ: number): SceneState {
  const restored = updateNoteInScene(scene, id, { deleted: false, deletedAt: null, z: highestZ + 1 }, 'restored');
  return { ...restored, activeNoteId: id };
}

export function bringNoteToFrontInScene(scene: SceneState, id: string): SceneState {
  return {
    ...scene,
    notes: scene.notes.map((note) =>
      note.id === id
        ? { ...note, z: scene.notes.reduce((acc, n) => Math.max(acc, n.z), 0) + 1 }
        : note
    )
  };
}

export function setIsDraggingInScene(scene: SceneState, isDragging: boolean): SceneState {
  return scene.isDragging === isDragging ? scene : { ...scene, isDragging };
}

export function setLensInScene(scene: SceneState, lens: Lens): SceneState {
  return { ...scene, lens: normalizeLens(lens) };
}

export function setCanvasScrollInScene(scene: SceneState, left: number, top: number): SceneState {
  return scene.canvasScrollLeft === left && scene.canvasScrollTop === top ? scene : { ...scene, canvasScrollLeft: left, canvasScrollTop: top };
}

export function openNoteInScene(scene: SceneState, id: string): SceneState {
  const target = scene.notes.find((note) => note.id === id);
  if (!target || target.deleted) return scene;
  return { ...scene, activeNoteId: id };
}

export function closeActiveNoteInScene(scene: SceneState): SceneState {
  return { ...scene, activeNoteId: null };
}

export function archiveNoteInScene(scene: SceneState, id: string): SceneState {
  const archived = updateNoteInScene(scene, id, { archived: true }, 'archive');
  return { ...archived, activeNoteId: null, lens: { kind: 'archive' } };
}

export function restoreNoteInScene(scene: SceneState, id: string, highestZ: number): SceneState {
  const restored = updateNoteInScene(scene, id, { archived: false, z: highestZ + 1 }, 'restored');
  return { ...restored, lens: createDefaultLens() };
}

export function handleCtrlTapInScene(scene: SceneState, tappedAt: number, thresholdMs: number): SceneState {
  if (tappedAt - scene.lastCtrlTapTs <= thresholdMs) {
    const open = scene.expandedSecondarySurface !== 'capture';
    return {
      ...scene,
      expandedSecondarySurface: open ? 'capture' : 'none',
      lastCtrlTapTs: 0
    };
  }

  return { ...scene, lastCtrlTapTs: tappedAt };
}

export function toggleNoteFocusInScene(scene: SceneState, id: string): SceneState {
  return {
    ...scene,
    notes: scene.notes.map((note) =>
      note.id === id ? { ...note, inFocus: !Boolean(note.isFocus ?? note.inFocus), isFocus: !Boolean(note.isFocus ?? note.inFocus) } : note
    )
  };
}

export function setFocusModeInScene(scene: SceneState, updates: Partial<FocusMode>): SceneState {
  return { ...scene, focusMode: { ...scene.focusMode, ...updates } };
}

export function setCaptureComposerState(scene: SceneState, updates: Partial<SceneState['captureComposer']>): SceneState {
  return { ...scene, captureComposer: { ...scene.captureComposer, ...updates } };
}

export function setExpandedSecondarySurface(scene: SceneState, surface: ExpandedSecondarySurface): SceneState {
  return { ...scene, expandedSecondarySurface: surface };
}

export function setAIPanelPayload(scene: SceneState, updates: Partial<SceneState['aiPanel']>): SceneState {
  return { ...scene, aiPanel: { ...scene.aiPanel, ...updates } };
}
