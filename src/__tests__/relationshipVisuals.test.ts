import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RELATIONSHIP_VISUAL_TOKENS,
  getProjectGroupingVisual,
  getProjectNoteVisual,
  getSemanticRelationshipCategory,
  getSemanticRelationshipVisual
} from '../relationships/relationshipVisuals';
import type { Relationship } from '../types';

const explicitRelationship: Relationship = {
  id: 'rel-1',
  fromId: 'a',
  toId: 'b',
  type: 'references',
  state: 'confirmed',
  explicitness: 'explicit',
  directional: true,
  confidence: 1,
  isInferred: false,
  explanation: 'Explicit reference',
  heuristicSupported: true,
  createdAt: 1,
  lastActiveAt: 1
};

const inferredRelationship: Relationship = {
  ...explicitRelationship,
  id: 'rel-2',
  type: 'related',
  directional: false,
  explicitness: 'inferred',
  isInferred: true,
  confidence: 0.62,
  explanation: 'Shared keyword'
};

test('semantic relationship visuals map direct and inferred categories without relying on color alone', () => {
  assert.equal(getSemanticRelationshipCategory(explicitRelationship), 'direct');
  assert.equal(getSemanticRelationshipCategory(inferredRelationship), 'inferred');

  const direct = getSemanticRelationshipVisual(explicitRelationship, 0.9);
  const inferred = getSemanticRelationshipVisual(inferredRelationship, 0.9);

  assert.equal(direct.label, 'Reference');
  assert.equal(inferred.label, 'Related');
  assert.equal(direct.edge.dasharray, 'none');
  assert.equal(inferred.edge.dasharray, RELATIONSHIP_VISUAL_TOKENS.semantic.inferred.edge.dasharray);
  assert.ok(direct.edge.strokeWidth > inferred.edge.strokeWidth);
  assert.equal(direct.node.borderStyle, 'solid');
  assert.equal(inferred.node.borderStyle, 'dashed');
});

test('emphasis amplifies visibility without erasing semantic category meaning', () => {
  const base = getSemanticRelationshipVisual(inferredRelationship, 0.6, 'default');
  const selected = getSemanticRelationshipVisual(inferredRelationship, 0.6, 'selected');

  assert.equal(base.category, selected.category);
  assert.equal(base.edge.dasharray, selected.edge.dasharray);
  assert.equal(base.node.borderStyle, selected.node.borderStyle);
  assert.ok(selected.edge.opacity > base.edge.opacity);
  assert.ok(selected.node.backgroundOpacity > base.node.backgroundOpacity);
});

test('project grouping visuals stay distinct from semantic edges at the token level', () => {
  const project = getProjectGroupingVisual();
  const direct = getSemanticRelationshipVisual(explicitRelationship, 0.8);
  const member = getProjectNoteVisual('member');
  const subordinate = getProjectNoteVisual('subordinate');

  assert.equal(project.connector.dasharray, 'none');
  assert.ok(project.connector.strokeWidth >= direct.edge.strokeWidth * 6);
  assert.ok(project.connector.opacity < direct.edge.opacity);
  assert.ok(member.glowStrength > 0);
  assert.ok(subordinate.opacityMultiplier < 1);
});
