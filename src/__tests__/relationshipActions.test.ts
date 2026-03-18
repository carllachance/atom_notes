import { describe, expect, it, vi } from 'vitest';
import {
  confirmRelationshipInScene,
  createExplicitRelationshipInScene,
  traverseToRelatedInScene
} from '../relationships/relationshipActions';
import { SceneState } from '../types';

function baseScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: null, body: 'A', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false },
      { id: 'b', title: null, body: 'B', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 1, updatedAt: 1, archived: false }
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

describe('relationshipActions invariants', () => {
  it('creates explicit relationship and prevents duplicate explicit links', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100);
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('rel-1');

    const scene1 = createExplicitRelationshipInScene(baseScene(), 'a', 'b', 'references');
    expect(scene1.relationships.some((r) => r.id === 'rel-1' && r.explicitness === 'explicit')).toBe(true);
    expect(scene1.relationships[0]).toMatchObject({ state: 'active', reinforcementScore: 0.78 });

    const scene2 = createExplicitRelationshipInScene(scene1, 'a', 'b', 'references');
    expect(scene2).toBe(scene1);
  });

  it('confirms and traverses relationships deterministically', () => {
    vi.spyOn(Date, 'now').mockReturnValue(200);
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
          reinforcementScore: 0.4,
          explanation: 'Shared keyword',
          heuristicSupported: false,
          createdAt: 10,
          lastActiveAt: 10
        }
      ]
    };

    const confirmed = confirmRelationshipInScene(scene, 'rel-x');
    expect(confirmed.relationships[0]).toMatchObject({
      state: 'confirmed',
      heuristicSupported: true,
      lastActiveAt: 200
    });
    expect(confirmed.relationships[0].reinforcementScore).toBeGreaterThan(0.4);

    const traversed = traverseToRelatedInScene(confirmed, 'b', 'rel-x');
    expect(traversed.activeNoteId).toBe('b');
    expect(traversed.relationships[0]).toMatchObject({ state: 'active', lastActiveAt: 200 });
  });
});
