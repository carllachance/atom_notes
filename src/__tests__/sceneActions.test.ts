import test from 'node:test';
import assert from 'node:assert/strict';
import {
  archiveNoteInScene,
  closeActiveNoteInScene,
  openNoteInScene,
  restoreNoteInScene,
  setCanvasScrollInScene,
  setLensInScene,
  toggleNoteFocusInScene,
  updateNoteInScene
} from '../scene/sceneActions';
import type { SceneState } from '../types';

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

test('sceneActions updates note content with normalized title and trace', (t: any) => {
  t.mock.method(Date, 'now', () => 999);
  const next = updateNoteInScene(makeScene(), 'n1', { title: '  ', body: 'updated' }, 'refined');
  assert.deepEqual(next.notes[0], {
    ...makeScene().notes[0],
    title: null,
    body: 'updated',
    trace: 'refined',
    updatedAt: 999
  });
});

test('sceneActions handle open, close, archive, restore, and canvas scroll semantics', () => {
  const opened = openNoteInScene(makeScene(), 'n1');
  assert.equal(opened.activeNoteId, 'n1');

  const closed = closeActiveNoteInScene(opened);
  assert.equal(closed.activeNoteId, null);

  const archived = archiveNoteInScene(opened, 'n1');
  assert.equal(archived.lens, 'archive');
  assert.equal(archived.activeNoteId, null);
  assert.equal(archived.notes[0].archived, true);

  const restored = restoreNoteInScene(archived, 'n1', 4);
  assert.equal(restored.lens, 'all');
  assert.deepEqual(restored.notes[0], { ...archived.notes[0], archived: false, z: 5, trace: 'restored' });

  assert.equal(setCanvasScrollInScene(restored, 0, 0), restored);
  assert.deepEqual(setCanvasScrollInScene(restored, 8, 9), { ...restored, canvasScrollLeft: 8, canvasScrollTop: 9 });

  const focusedLens = setLensInScene(restored, 'focus');
  assert.equal(focusedLens.lens, 'focus');

  const focused = toggleNoteFocusInScene(restored, 'n1');
  assert.equal(focused.notes[0].inFocus, true);
  const unfocused = toggleNoteFocusInScene(focused, 'n1');
  assert.equal(unfocused.notes[0].inFocus, false);
});
