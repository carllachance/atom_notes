import { describe, expect, it, vi } from 'vitest';
import {
  archiveNoteInScene,
  closeActiveNoteInScene,
  openNoteInScene,
  restoreNoteInScene,
  setCanvasScrollInScene,
  setLensInScene,
  updateNoteInScene,
  toggleNoteFocusInScene
} from '../scene/sceneActions';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'n1', title: null, body: 'Body', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false }
    ],
    relationships: [],
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    lens: 'all',
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

describe('sceneActions behavior contracts', () => {
  it('updates note content with normalized title and trace', () => {
    vi.spyOn(Date, 'now').mockReturnValue(999);
    const next = updateNoteInScene(makeScene(), 'n1', { title: '  ', body: 'updated' }, 'refined');
    expect(next.notes[0]).toMatchObject({ title: null, body: 'updated', trace: 'refined', updatedAt: 999 });
  });

  it('handles open/close/archive/restore and canvas scroll semantics', () => {
    const opened = openNoteInScene(makeScene(), 'n1');
    expect(opened.activeNoteId).toBe('n1');

    const closed = closeActiveNoteInScene(opened);
    expect(closed.activeNoteId).toBeNull();

    const archived = archiveNoteInScene(opened, 'n1');
    expect(archived.lens).toBe('archive');
    expect(archived.activeNoteId).toBeNull();
    expect(archived.notes[0].archived).toBe(true);

    const restored = restoreNoteInScene(archived, 'n1', 4);
    expect(restored.lens).toBe('all');
    expect(restored.notes[0]).toMatchObject({ archived: false, z: 5 });

    expect(setCanvasScrollInScene(restored, 0, 0)).toBe(restored);
    expect(setCanvasScrollInScene(restored, 8, 9)).toMatchObject({ canvasScrollLeft: 8, canvasScrollTop: 9 });


    const focusedLens = setLensInScene(restored, 'focus');
    expect(focusedLens.lens).toBe('focus');

    const focused = toggleNoteFocusInScene(restored, 'n1');
    expect(focused.notes[0].inFocus).toBe(true);
    const unfocused = toggleNoteFocusInScene(focused, 'n1');
    expect(unfocused.notes[0].inFocus).toBe(false);
  });
});
