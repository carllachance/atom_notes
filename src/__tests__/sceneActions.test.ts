import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveNoteInScene, closeActiveNoteInScene, deleteNoteInScene, handleCtrlTapInScene, openNoteInScene, restoreDeletedNoteInScene, restoreNoteInScene, setCanvasScrollInScene, setCaptureComposerState, setFocusModeInScene, setIsDraggingInScene, setLensInScene, toggleNoteFocusInScene, updateNoteInScene } from '../scene/sceneActions';
import type { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [{ id: 'n1', title: null, body: 'Body', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] }],
    relationships: [],
    projects: [],
    workspaces: [],
    isDragging: false,
    activeNoteId: null,
    expandedSecondarySurface: 'none',
    captureComposer: { draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { mode: 'ask', query: '', response: null, transcript: [], loading: false, communicationState: 'idle', interactionMode: 'live-stream' },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

test('sceneActions updates note content with normalized title, trace, project ids, and workspace ids', (t: any) => {
  t.mock.method(Date, 'now', () => 999);
  const next = updateNoteInScene(makeScene(), 'n1', { title: '  ', body: 'updated', projectIds: ['p1', 'p1'], workspaceId: 'ws-1' }, 'refined');
  assert.deepEqual(next.notes[0], { ...makeScene().notes[0], title: null, body: 'updated', trace: 'refined', updatedAt: 999, projectIds: ['p1'], workspaceId: 'ws-1', workspaceIds: ['ws-1'] });
});

test('sceneActions handle open, close, archive, restore, focus, and composer semantics', () => {
  const opened = openNoteInScene(makeScene(), 'n1');
  assert.equal(opened.activeNoteId, 'n1');
  assert.equal(opened.expandedSecondarySurface, 'none');
  assert.equal(closeActiveNoteInScene(opened).activeNoteId, null);
  const archived = archiveNoteInScene(opened, 'n1');
  assert.deepEqual(archived.lens, { kind: 'archive' });
  const restored = restoreNoteInScene(archived, 'n1', 4);
  assert.deepEqual(restored.lens, { kind: 'universe' });
  assert.equal(setCanvasScrollInScene(restored, 0, 0), restored);
  assert.deepEqual(setCanvasScrollInScene(restored, 8, 9), { ...restored, canvasScrollLeft: 8, canvasScrollTop: 9 });
  assert.equal(setIsDraggingInScene(restored, false), restored);
  assert.equal(setIsDraggingInScene(restored, true).isDragging, true);
  assert.deepEqual(
    setLensInScene(restored, { kind: 'workspace', workspaceId: 'ws-1', workspaceIds: ['ws-1', 'ws-1'], mode: 'context' }).lens,
    { kind: 'workspace', workspaceId: 'ws-1', workspaceIds: ['ws-1'], mode: 'context' }
  );
  const focused = toggleNoteFocusInScene(restored, 'n1');
  assert.equal(focused.notes[0].isFocus, true);
  assert.equal(setFocusModeInScene(restored, { isolate: true }).focusMode.isolate, true);
  assert.equal(setCaptureComposerState(restored, { draft: 'hello' }).captureComposer.draft, 'hello');
});

test('sceneActions open quick capture on Ctrl double-tap regardless of note state', () => {
  const once = handleCtrlTapInScene(makeScene(), 500, 320);
  assert.equal(once.expandedSecondarySurface, 'none');
  const twice = handleCtrlTapInScene(once, 700, 320);
  assert.equal(twice.expandedSecondarySurface, 'capture');
  const closed = handleCtrlTapInScene(handleCtrlTapInScene({ ...twice, activeNoteId: 'n1' }, 1200, 320), 1400, 320);
  assert.equal(closed.expandedSecondarySurface, 'none');
});

test('sceneActions soft-delete notes and restore them with their relationships intact', (t: any) => {
  t.mock.method(Date, 'now', () => 1200);
  const scene = {
    ...makeScene(),
    activeNoteId: 'n1',
    relationships: [
      {
        id: 'rel-1',
        fromId: 'n1',
        toId: 'n2',
        type: 'references' as const,
        state: 'confirmed' as const,
        explicitness: 'explicit' as const,
        directional: true,
        confidence: 1,
        isInferred: false,
        explanation: 'Manual link',
        heuristicSupported: true,
        createdAt: 1,
        lastActiveAt: 1
      }
    ],
    notes: [
      makeScene().notes[0],
      { ...makeScene().notes[0], id: 'n2', body: 'Second note', z: 2 }
    ]
  };

  const deleted = deleteNoteInScene(scene, 'n1');
  assert.equal(deleted.notes.find((note) => note.id === 'n1')?.deleted, true);
  assert.equal(deleted.activeNoteId, null);
  assert.equal(deleted.relationships.some((relationship) => relationship.id === 'rel-1'), true);

  const restored = restoreDeletedNoteInScene(deleted, 'n1', 3);
  assert.equal(restored.notes.find((note) => note.id === 'n1')?.deleted, false);
  assert.equal(restored.activeNoteId, 'n1');
  assert.equal(restored.relationships.some((relationship) => relationship.id === 'rel-1'), true);
});
