import { describe, expect, it, vi } from 'vitest';
import { getRankedRelationshipsForNote, isRenderableRelationship, refreshInferredRelationships } from '../relationshipLogic';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: 'Alpha', body: 'alpha body', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false },
      { id: 'b', title: 'Beta', body: 'beta body', anchors: [], trace: 'idle', x: 20, y: 20, z: 2, createdAt: 1, updatedAt: 1, archived: false },
      { id: 'c', title: 'Gamma', body: 'gamma body', anchors: [], trace: 'idle', x: 40, y: 40, z: 3, createdAt: 1, updatedAt: 1, archived: false }
    ],
    relationships: [
      {
        id: 'rel-active',
        fromId: 'a',
        toId: 'b',
        type: 'references',
        state: 'active',
        explicitness: 'explicit',
        confidence: 1,
        reinforcementScore: 0.92,
        explanation: 'Created by you.',
        heuristicSupported: true,
        createdAt: 1,
        lastActiveAt: 1_000
      },
      {
        id: 'rel-history',
        fromId: 'a',
        toId: 'c',
        type: 'related_concept',
        state: 'historical',
        explicitness: 'inferred',
        confidence: 0.55,
        reinforcementScore: 0.28,
        explanation: 'Shared keywords: gamma, archive',
        heuristicSupported: false,
        createdAt: 1,
        lastActiveAt: 1
      }
    ],
    activeNoteId: 'a',
    quickCaptureOpen: false,
    lastCtrlTapTs: 0,
    lens: 'all',
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

describe('relationshipLogic lifecycle visibility', () => {
  it('suppresses historical links from the default modal ranking but returns them in history mode', () => {
    vi.spyOn(Date, 'now').mockReturnValue(2_000);
    const scene = makeScene();

    const defaultRanked = getRankedRelationshipsForNote('a', scene, 'all');
    expect(defaultRanked.map((item) => item.relationship.id)).toEqual(['rel-active']);

    const historyRanked = getRankedRelationshipsForNote('a', scene, 'history');
    expect(historyRanked.map((item) => item.relationship.id)).toEqual(['rel-history']);
    expect(isRenderableRelationship(scene.relationships[1], 'all')).toBe(false);
    expect(isRenderableRelationship(scene.relationships[1], 'history')).toBe(true);
  });

  it('retains confirmed inferred links as historical context when their heuristic support disappears', () => {
    const nowTs = 40 * 24 * 60 * 60 * 1000;
    const notes = [
      { id: 'a', title: 'Alpha', body: 'plain body', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false },
      { id: 'b', title: 'Beta', body: 'different body', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 1, updatedAt: 1, archived: false }
    ];

    const refreshed = refreshInferredRelationships(
      notes,
      [
        {
          id: 'rel-stale',
          fromId: 'a',
          toId: 'b',
          type: 'related_concept',
          state: 'confirmed',
          explicitness: 'inferred',
          confidence: 0.7,
          reinforcementScore: 0.45,
          explanation: 'Shared keywords: alpha, beta',
          heuristicSupported: true,
          createdAt: 1,
          lastActiveAt: 1
        }
      ],
      nowTs
    );

    expect(refreshed).toHaveLength(1);
    expect(refreshed[0]).toMatchObject({
      id: 'rel-stale',
      heuristicSupported: false,
      state: 'historical'
    });
  });
});
