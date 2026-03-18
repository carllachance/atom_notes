import { describe, expect, it, vi } from '../test/vitest';
import {
  confirmRelationshipInScene,
  createExplicitRelationshipInScene,
  traverseToRelatedInScene
} from '../relationships/relationshipActions';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: null, body: 'alpha', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] },
      { id: 'b', title: null, body: 'beta', anchors: [], trace: 'idle', x: 10, y: 10, z: 2, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] }
    ],
    relationships: [],
    projects: [],
    projectReveal: { activeProjectId: null },
    activeNoteId: 'a',
    quickCaptureOpen: false,
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

    const scene1 = createExplicitRelationshipInScene(makeScene(), 'a', 'b', 'related_concept');
    expect(scene1.relationships.some((r) => r.id === 'rel-1' && r.explicitness === 'explicit')).toBe(true);

    const scene2 = createExplicitRelationshipInScene(scene1, 'b', 'a', 'related_concept');
    expect(scene2).toBe(scene1);
  });

  it('confirms and traverses relationships deterministically', () => {
    vi.spyOn(Date, 'now').mockReturnValue(200);
    const scene = {
      ...makeScene(),
      relationships: [
        {
          id: 'r1',
          fromId: 'a',
          toId: 'b',
          type: 'references' as const,
          state: 'proposed' as const,
          explicitness: 'inferred' as const,
          confidence: 0.7,
          explanation: 'Shared url',
          heuristicSupported: true,
          createdAt: 100,
          lastActiveAt: 100
        }
      ]
    };

    const confirmed = confirmRelationshipInScene(scene, 'r1');
    expect(confirmed.relationships[0]).toMatchObject({ state: 'confirmed', heuristicSupported: true, lastActiveAt: 200 });

    const traversed = traverseToRelatedInScene(confirmed, 'b', 'r1');
    expect(traversed.activeNoteId).toBe('b');
    expect(traversed.relationships[0].lastActiveAt).toBe(200);
  });
});
