import test from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmRelationshipInScene,
  createExplicitRelationshipInScene,
  traverseToRelatedInScene
} from '../relationships/relationshipActions';
import type { SceneState } from '../types';

function baseScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: null, body: 'A', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] },
      { id: 'b', title: null, body: 'B', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] }
    ],
    relationships: [],
    projects: [],
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    lens: 'all',
    canvasScrollLeft: 0,
    canvasScrollTop: 0,
    projectReveal: { activeProjectId: null, isolate: false }
  };
}

test('relationshipActions creates explicit relationship and prevents duplicate explicit links', (t: any) => {
  t.mock.method(Date, 'now', () => 100);
  t.mock.method(globalThis.crypto, 'randomUUID', () => 'rel-1');

  const scene1 = createExplicitRelationshipInScene(baseScene(), 'a', 'b', 'references');
  assert.equal(scene1.relationships.some((r) => r.id === 'rel-1' && r.explicitness === 'explicit'), true);

  const scene2 = createExplicitRelationshipInScene(scene1, 'a', 'b', 'references');
  assert.equal(scene2, scene1);
});

test('relationshipActions confirms and traverses relationships deterministically', (t: any) => {
  t.mock.method(Date, 'now', () => 200);
  const scene = {
    ...baseScene(),
    relationships: [
      {
        id: 'rel-x',
        fromId: 'a',
        toId: 'b',
        type: 'related_concept' as const,
        state: 'proposed' as const,
        explicitness: 'inferred' as const,
        confidence: 0.5,
        explanation: 'Shared keyword',
        heuristicSupported: false,
        createdAt: 10,
        lastActiveAt: 10
      }
    ]
  };

  const confirmed = confirmRelationshipInScene(scene, 'rel-x');
  assert.deepEqual(confirmed.relationships[0], {
    ...scene.relationships[0],
    state: 'confirmed',
    heuristicSupported: true,
    lastActiveAt: 200
  });

  const traversed = traverseToRelatedInScene(confirmed, 'b', 'rel-x');
  assert.equal(traversed.activeNoteId, 'b');
  assert.equal(traversed.relationships[0].lastActiveAt, 200);
});
