import { now } from '../notes/noteModel';
import { normalizeOptionalTitle } from '../noteText';
import { refreshInferredRelationships } from '../relationshipLogic';
import { Lens, NoteCardModel, SceneState } from '../types';
import { normalizeProjectMembership } from '../projects/projectModel';

export function updateNoteInScene(
  scene: SceneState,
  id: string,
  updates: Partial<NoteCardModel>,
  trace?: string
): SceneState {
  const normalizedUpdates = {
    ...updates,
    ...('title' in updates
      ? { title: normalizeOptionalTitle((updates.title as string | null | undefined) ?? null) }
      : {}),
    ...('projectIds' in updates ? { projectIds: normalizeProjectMembership(updates.projectIds) } : {})
  };

  const notes = scene.notes.map((note) => {
    if (note.id !== id) return note;
    return {
      ...note,
      ...normalizedUpdates,
      trace: trace ?? normalizedUpdates.trace ?? note.trace,
      updatedAt: now()
    };
  });

  return {
    ...scene,
    notes,
    relationships: refreshInferredRelationships(notes, scene.relationships, now())
  };
}

export function bringNoteToFrontInScene(scene: SceneState, id: string): SceneState {
  return {
    ...scene,
    notes: scene.notes.map((note) =>
      note.id === id
        ? {
            ...note,
            z: scene.notes.reduce((acc, n) => Math.max(acc, n.z), 0) + 1
          }
        : note
    )
  };
}

export function setLensInScene(scene: SceneState, lens: Lens): SceneState {
  return { ...scene, lens };
}

export function setCanvasScrollInScene(scene: SceneState, left: number, top: number): SceneState {
  return scene.canvasScrollLeft === left && scene.canvasScrollTop === top
    ? scene
    : { ...scene, canvasScrollLeft: left, canvasScrollTop: top };
}

export function openNoteInScene(scene: SceneState, id: string): SceneState {
  return { ...scene, activeNoteId: id };
}

export function closeActiveNoteInScene(scene: SceneState): SceneState {
  return { ...scene, activeNoteId: null };
}

export function archiveNoteInScene(scene: SceneState, id: string): SceneState {
  const archived = updateNoteInScene(scene, id, { archived: true }, 'archive');
  return { ...archived, activeNoteId: null, lens: 'archive' };
}

export function restoreNoteInScene(scene: SceneState, id: string, highestZ: number): SceneState {
  const restored = updateNoteInScene(scene, id, { archived: false, z: highestZ + 1 }, 'restored');
  return { ...restored, lens: 'all' };
}


export function toggleNoteFocusInScene(scene: SceneState, id: string): SceneState {
  return {
    ...scene,
    notes: scene.notes.map((note) => (note.id === id ? { ...note, inFocus: !note.inFocus } : note))
  };
}
