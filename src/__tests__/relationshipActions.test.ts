import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  confirmRelationshipInScene,
  createExplicitRelationshipInScene,
  traverseToRelatedInScene
} from '../relationships/relationshipActions';
import { createWorkspaceLens } from '../scene/lens';
import { SceneState } from '../types';

function baseScene(): SceneState {
  return {
    notes: [
      {
        id: 'a',
        title: null,
        body: 'A',
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
        projectIds: []
      },
      {
        id: 'b',
        title: null,
        body: 'B',
        anchors: [],
        trace: 'idle',
        x: 0,
        y: 0,
        z: 2,
        createdAt: 1,
        updatedAt: 1,
        archived: false,
        workspaceId: 'ops',
        workspaceAffinities: ['ops'],
        projectIds: []
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

describe('relationshipActions invariants', () => {
  it('creates explicit relationship and prevents duplicate explicit links', () => {
    const originalNow = Date.now;
    const originalUuid = globalThis.crypto.randomUUID;
    Date.now = () => 100;
    globalThis.crypto.randomUUID = (() => 'rel-1') as unknown as typeof globalThis.crypto.randomUUID;

    try {
      const scene1 = createExplicitRelationshipInScene(baseScene(), 'a', 'b', 'references');
      assert.equal(scene1.relationships.some((relationship) => relationship.id === 'rel-1' && relationship.explicitness === 'explicit'), true);

      const scene2 = createExplicitRelationshipInScene(scene1, 'a', 'b', 'references');
      assert.equal(scene2, scene1);
    } finally {
      Date.now = originalNow;
      globalThis.crypto.randomUUID = originalUuid;
    }
  });

  it('confirms and traverses relationships deterministically', () => {
    const originalNow = Date.now;
    Date.now = () => 200;

    try {
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
      assert.deepEqual(
        {
          state: confirmed.relationships[0].state,
          heuristicSupported: confirmed.relationships[0].heuristicSupported,
          lastActiveAt: confirmed.relationships[0].lastActiveAt
        },
        { state: 'confirmed', heuristicSupported: true, lastActiveAt: 200 }
      );

      const traversed = traverseToRelatedInScene(confirmed, 'b', 'rel-x');
      assert.equal(traversed.activeNoteId, 'b');
      assert.equal(traversed.relationships[0].lastActiveAt, 200);
    } finally {
      Date.now = originalNow;
    }
  });
});
