import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveNoteInScene, closeActiveNoteInScene, openNoteInScene, restoreNoteInScene, setCanvasScrollInScene, setCaptureComposerState, setFocusModeInScene, setIsDraggingInScene, setLensInScene, toggleNoteFocusInScene, updateNoteInScene } from '../scene/sceneActions';
import type { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [{ id: 'n1', title: null, body: 'Body', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] }],
    relationships: [],
    projects: [],
    workspaces: [],
    isDragging: false,
    activeNoteId: null,
    quickCaptureOpen: false,
    captureComposer: { open: false, draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { state: 'hidden', mode: 'ask', query: '', response: null, transcript: [], loading: false },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

test('sceneActions updates note content with normalized title, trace, project ids, and workspace ids', (t: any) => {
  t.mock.method(Date, 'now', () => 999);
  const next = updateNoteInScene(makeScene(), 'n1', { title: '  ', body: 'updated', projectIds: ['p1', 'p1'], workspaceId: 'ws-1' }, 'refined');
  assert.deepEqual(next.notes[0], { ...makeScene().notes[0], title: null, body: 'updated', trace: 'refined', updatedAt: 999, projectIds: ['p1'], workspaceId: 'ws-1' });
});

test('sceneActions handle open, close, archive, restore, focus, and composer semantics', () => {
  const opened = openNoteInScene(makeScene(), 'n1');
  assert.equal(opened.activeNoteId, 'n1');
  assert.equal(opened.aiPanel.state, 'open');
  assert.equal(closeActiveNoteInScene(opened).activeNoteId, null);
  const archived = archiveNoteInScene(opened, 'n1');
  assert.deepEqual(archived.lens, { kind: 'archive' });
  const restored = restoreNoteInScene(archived, 'n1', 4);
  assert.deepEqual(restored.lens, { kind: 'universe' });
  assert.equal(setCanvasScrollInScene(restored, 0, 0), restored);
  assert.deepEqual(setCanvasScrollInScene(restored, 8, 9), { ...restored, canvasScrollLeft: 8, canvasScrollTop: 9 });
  assert.equal(setIsDraggingInScene(restored, false), restored);
  assert.equal(setIsDraggingInScene(restored, true).isDragging, true);
  assert.deepEqual(setLensInScene(restored, { kind: 'workspace', workspaceId: 'ws-1', mode: 'context' }).lens, { kind: 'workspace', workspaceId: 'ws-1', mode: 'context' });
  const focused = toggleNoteFocusInScene(restored, 'n1');
  assert.equal(focused.notes[0].isFocus, true);
  assert.equal(setFocusModeInScene(restored, { isolate: true }).focusMode.isolate, true);
  assert.equal(setCaptureComposerState(restored, { open: true, draft: 'hello' }).captureComposer.draft, 'hello');
});
