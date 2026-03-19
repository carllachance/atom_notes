import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFocusLensPresentation, pinFocusLensLayout, restoreFocusLensSnapshot, snapshotFocusLensPositions } from '../scene/focusLens';
import type { FocusLensSession } from '../scene/focusLens';
import type { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: 'Alpha', body: 'Root note', anchors: [], trace: 'idle', x: 200, y: 200, z: 1, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: ['p1'], inferredProjectIds: [], workspaceId: 'w1', inferredRelationships: [] },
      { id: 'b', title: 'Beta', body: 'Direct task support', anchors: [], trace: 'idle', x: 340, y: 220, z: 2, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: ['p1'], inferredProjectIds: [], workspaceId: 'w1', inferredRelationships: [] },
      { id: 'c', title: 'Gamma', body: 'Direct source note', anchors: [], trace: 'idle', x: 220, y: 360, z: 3, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: ['p1'], inferredProjectIds: [], workspaceId: 'w1', inferredRelationships: [] },
      { id: 'd', title: 'Delta', body: 'Second degree context', anchors: [], trace: 'idle', x: 500, y: 320, z: 4, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: ['p2'], inferredProjectIds: [], workspaceId: 'w2', inferredRelationships: [] },
      { id: 'e', title: 'Echo', body: 'Background context', anchors: [], trace: 'idle', x: 640, y: 420, z: 5, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] }
    ],
    relationships: [
      { id: 'r1', fromId: 'a', toId: 'b', type: 'depends_on', state: 'confirmed', explicitness: 'explicit', directional: true, confidence: 1, isInferred: false, explanation: 'A depends on B', heuristicSupported: true, createdAt: 1, lastActiveAt: Date.now() },
      { id: 'r2', fromId: 'a', toId: 'c', type: 'references', state: 'confirmed', explicitness: 'explicit', directional: true, confidence: 1, isInferred: false, explanation: 'A cites C', heuristicSupported: true, createdAt: 1, lastActiveAt: Date.now() - 1000 },
      { id: 'r3', fromId: 'b', toId: 'd', type: 'supports', state: 'confirmed', explicitness: 'explicit', directional: true, confidence: 0.92, isInferred: false, explanation: 'B is supported by D', heuristicSupported: true, createdAt: 1, lastActiveAt: Date.now() - 2000 }
    ],
    projects: [
      { id: 'p1', key: 'FOCUS', name: 'Focus', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 },
      { id: 'p2', key: 'WIDE', name: 'Wide', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }
    ],
    workspaces: [
      { id: 'w1', key: 'LAB', name: 'Lab', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 },
      { id: 'w2', key: 'OPS', name: 'Ops', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }
    ],
    isDragging: false,
    activeNoteId: 'a',
    expandedSecondarySurface: 'none',
    captureComposer: { draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { mode: 'ask', query: '', response: null, transcript: [], loading: false },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

function makeSession(scene: SceneState): FocusLensSession {
  return {
    rootNoteId: 'a',
    focusStack: ['a', 'b'],
    snapshot: snapshotFocusLensPositions(scene),
    pinned: false
  };
}

test('focus lens elevates direct neighbors, keeps second-degree context faint, and preserves background notes', () => {
  const scene = makeScene();
  const presentation = buildFocusLensPresentation(scene, scene.notes[0], makeSession(scene));

  assert.equal(presentation.active, true);
  assert.deepEqual(presentation.primaryNoteIds, ['b', 'c']);
  assert.deepEqual(presentation.contextNoteIds, ['d']);
  assert.equal(presentation.noteStateById.a.tier, 'active');
  assert.equal(presentation.noteStateById.b.tier, 'neighbor');
  assert.equal(presentation.noteStateById.d.tier, 'context');
  assert.equal(presentation.noteStateById.e.tier, 'background');
  assert.notDeepEqual(presentation.layoutById.b, { x: scene.notes[1].x, y: scene.notes[1].y });
  assert.equal(presentation.canGoBack, true);
});

test('focus lens pinning and restore use the same snapshot boundaries', () => {
  const scene = makeScene();
  const session = makeSession(scene);
  const presentation = buildFocusLensPresentation(scene, scene.notes[0], session);
  const pinned = pinFocusLensLayout(scene, presentation.layoutById);

  assert.notEqual(pinned.notes.find((note) => note.id === 'b')?.x, scene.notes.find((note) => note.id === 'b')?.x);

  const restored = restoreFocusLensSnapshot(pinned, session.snapshot);
  assert.equal(restored.notes.find((note) => note.id === 'b')?.x, scene.notes.find((note) => note.id === 'b')?.x);
  assert.equal(restored.notes.find((note) => note.id === 'c')?.y, scene.notes.find((note) => note.id === 'c')?.y);
});
