import { describe, expect, it } from 'vitest';
import { NoteCardModel, Relationship } from '../types';
import {
  RELATIONSHIP_VISUAL_TOKENS,
  buildProjectGroups,
  getProjectMembershipForRelationship,
  getProjectTokens,
  getRelationshipEdgePresentation,
  getRelationshipVisualKind
} from '../relationships/relationshipVisuals';

function note(id: string, anchors: string[] = [], x = 0, y = 0): NoteCardModel {
  return {
    id,
    title: id,
    body: id,
    anchors,
    trace: 'idle',
    x,
    y,
    z: 1,
    createdAt: 1,
    updatedAt: 1,
    archived: false
  };
}

function relationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: 'rel-1',
    fromId: 'a',
    toId: 'b',
    type: 'references',
    state: 'confirmed',
    explicitness: 'explicit',
    confidence: 1,
    explanation: 'Explicit link',
    heuristicSupported: true,
    createdAt: 1,
    lastActiveAt: 1,
    ...overrides
  };
}

describe('relationshipVisuals taxonomy', () => {
  it('maps explicit and inferred relationships to distinct visual categories', () => {
    expect(getRelationshipVisualKind(relationship({ explicitness: 'explicit' }))).toBe('direct');
    expect(getRelationshipVisualKind(relationship({ explicitness: 'inferred' }))).toBe('inferred');
  });

  it('preserves category-defining cues when interaction amplifies visibility', () => {
    const direct = getRelationshipEdgePresentation(relationship({ explicitness: 'explicit' }), {
      score: 0.7,
      interactionState: 'emphasized'
    });
    const inferred = getRelationshipEdgePresentation(relationship({ explicitness: 'inferred' }), {
      score: 0.7,
      interactionState: 'emphasized'
    });

    expect(direct.strokeWidth).toBeGreaterThan(inferred.strokeWidth);
    expect(direct.strokeDasharray).toBeUndefined();
    expect(inferred.strokeDasharray).toBe(RELATIONSHIP_VISUAL_TOKENS.inferred.strokeDasharray);
    expect(direct.strokeOpacity).toBeGreaterThan(inferred.strokeOpacity);
  });

  it('derives project grouping only from explicit project anchors', () => {
    expect(getProjectTokens(note('a', ['#topic/idea', '#project/atlas', 'project:roadmap']))).toEqual(['atlas', 'roadmap']);
    expect(getProjectTokens(note('b', ['#idea', '#topic/research']))).toEqual([]);
  });

  it('builds neutral project groups for visible notes that share a project with the active note', () => {
    const active = note('a', ['#project/atlas'], 100, 100);
    const projectMate = note('b', ['project:atlas'], 360, 160);
    const nonProjectMate = note('c', ['#project/other'], 640, 220);

    const groups = buildProjectGroups(active, [
      { relationship: relationship({ id: 'rel-project', toId: 'b' }), target: projectMate },
      { relationship: relationship({ id: 'rel-other', toId: 'c' }), target: nonProjectMate }
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id: 'project:atlas', noteIds: ['a', 'b'] });
    expect(groups[0].bounds.width).toBeGreaterThan(270);
    expect(getProjectMembershipForRelationship(active, projectMate)).toBe(true);
    expect(getProjectMembershipForRelationship(active, nonProjectMate)).toBe(false);
  });
});
