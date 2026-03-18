import { now } from '../notes/noteModel';
import { refreshInferredRelationships, reinforceRelationship, relationshipPairKey } from '../relationshipLogic';
import { RelationshipType, SceneState } from '../types';

export function createExplicitRelationshipInScene(
  scene: SceneState,
  fromId: string,
  toId: string,
  type: RelationshipType
): SceneState {
  const timestamp = now();
  const key = relationshipPairKey(fromId, toId, type);
  const existing = scene.relationships.find(
    (relationship) => relationshipPairKey(relationship.fromId, relationship.toId, relationship.type) === key
  );

  if (existing && existing.explicitness === 'explicit') return scene;

  const explicitRelationship = {
    id: existing?.id ?? crypto.randomUUID(),
    fromId,
    toId,
    type,
    state: 'confirmed' as const,
    explicitness: 'explicit' as const,
    confidence: 1,
    reinforcementScore: Math.max(existing?.reinforcementScore ?? 0, 0.78),
    explanation: 'Created by you in the modal.',
    heuristicSupported: true,
    createdAt: existing?.createdAt ?? timestamp,
    lastActiveAt: timestamp
  };

  const relationships = scene.relationships
    .filter((relationship) => relationshipPairKey(relationship.fromId, relationship.toId, relationship.type) !== key)
    .concat(explicitRelationship);

  return {
    ...scene,
    relationships: refreshInferredRelationships(scene.notes, relationships, timestamp)
  };
}

export function confirmRelationshipInScene(scene: SceneState, relationshipId: string): SceneState {
  const timestamp = now();

  return {
    ...scene,
    relationships: scene.relationships.map((relationship) =>
      relationship.id === relationshipId
        ? reinforceRelationship({ ...relationship, heuristicSupported: true }, timestamp, 'confirm')
        : relationship
    )
  };
}

export function traverseToRelatedInScene(scene: SceneState, targetNoteId: string, relationshipId: string): SceneState {
  const timestamp = now();

  return {
    ...scene,
    activeNoteId: targetNoteId,
    relationships: scene.relationships.map((relationship) =>
      relationship.id === relationshipId ? reinforceRelationship(relationship, timestamp, 'traverse') : relationship
    )
  };
}
