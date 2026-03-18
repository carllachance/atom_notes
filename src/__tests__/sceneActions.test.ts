import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
import { createArchiveLens, createProjectLens, createWorkspaceLens } from '../scene/lens';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      {
        id: 'n1',
        title: null,
        body: 'Body',
        anchors: [],
        trace: 'idle',
        x: 0,
        y: 0,
        z: 1,
        createdAt: 1,
        updatedAt: 1,
        archived: false,
        workspaceId: 'research',
        workspaceAffinities: ['research'],
        projectIds: ['atlas']
      }
    ],
    relationships: [],
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    lens: createWorkspaceLens(null),
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

describe('sceneActions behavior contracts', () => {
  it('updates note content with normalized title and trace', () => {
    const originalNow = Date.now;
    Date.now = () => 999;

    try {
      const next = updateNoteInScene(makeScene(), 'n1', { title: '  ', body: 'updated' }, 'refined');
      assert.deepEqual(
        {
          title: next.notes[0].title,
          body: next.notes[0].body,
          trace: next.notes[0].trace,
          updatedAt: next.notes[0].updatedAt
        },
        { title: null, body: 'updated', trace: 'refined', updatedAt: 999 }
      );
    } finally {
      Date.now = originalNow;
    }
  });

  it('switches lenses and handles open/close/archive/restore canvas semantics', () => {
    const opened = openNoteInScene(makeScene(), 'n1');
    assert.equal(opened.activeNoteId, 'n1');

    const closed = closeActiveNoteInScene(opened);
    assert.equal(closed.activeNoteId, null);

    const archived = archiveNoteInScene(opened, 'n1');
    assert.deepEqual(archived.lens, createArchiveLens());
    assert.equal(archived.activeNoteId, null);
    assert.equal(archived.notes[0].archived, true);

    const restored = restoreNoteInScene(archived, 'n1', 4);
    assert.deepEqual(restored.lens, createWorkspaceLens(null));
    assert.equal(restored.notes[0].archived, false);
    assert.equal(restored.notes[0].z, 5);

    assert.equal(setCanvasScrollInScene(restored, 0, 0), restored);
    assert.deepEqual(setCanvasScrollInScene(restored, 8, 9).canvasScrollLeft, 8);
    assert.deepEqual(setCanvasScrollInScene(restored, 8, 9).canvasScrollTop, 9);

    const workspaceScoped = setLensInScene(restored, createWorkspaceLens('research'));
    assert.deepEqual(workspaceScoped.lens, createWorkspaceLens('research'));

    const projectScoped = setLensInScene(workspaceScoped, createProjectLens('atlas', 'research'));
    assert.deepEqual(projectScoped.lens, createProjectLens('atlas', 'research'));

    const focused = toggleNoteFocusInScene(restored, 'n1');
    assert.equal(focused.notes[0].inFocus, true);
    const unfocused = toggleNoteFocusInScene(focused, 'n1');
    assert.equal(unfocused.notes[0].inFocus, false);
  });
});
