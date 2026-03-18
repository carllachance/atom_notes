import { now } from '../notes/noteModel';
import { refreshInferredRelationships, relationshipPairKey } from '../relationshipLogic';
import { RelationshipType, SceneState } from '../types';

const DIRECTIONAL_TYPES = new Set<RelationshipType>(['references', 'depends_on', 'supports', 'part_of', 'leads_to', 'derived_from']);

export function createExplicitRelationshipInScene(
  scene: SceneState,
  fromId: string,
  toId: string,
  type: RelationshipType
): SceneState {
  const directional = DIRECTIONAL_TYPES.has(type);
  const key = relationshipPairKey(fromId, toId, type, directional);
  const existing = scene.relationships.find(
    (relationship) => relationshipPairKey(relationship.fromId, relationship.toId, relationship.type, relationship.directional) === key
  );

  if (existing && existing.explicitness === 'explicit') return scene;

  const explicitRelationship = {
    id: existing?.id ?? crypto.randomUUID(),
    fromId,
    toId,
    type,
    state: 'confirmed' as const,
    explicitness: 'explicit' as const,
    directional,
    confidence: 1,
    isInferred: false,
    explanation: 'Created by you in the modal.',
    heuristicSupported: true,
    createdAt: existing?.createdAt ?? now(),
    lastActiveAt: now()
  };

  const relationships = scene.relationships
    .filter((relationship) => relationshipPairKey(relationship.fromId, relationship.toId, relationship.type, relationship.directional) !== key)
    .concat(explicitRelationship);

  return { ...scene, relationships: refreshInferredRelationships(scene.notes, relationships, now()) };
}

export function confirmRelationshipInScene(scene: SceneState, relationshipId: string): SceneState {
  return {
    ...scene,
    relationships: scene.relationships.map((relationship) =>
      relationship.id === relationshipId
        ? { ...relationship, state: 'confirmed', lastActiveAt: now(), heuristicSupported: true, isInferred: true }
        : relationship
    )
  };
}

export function traverseToRelatedInScene(scene: SceneState, targetNoteId: string, relationshipId: string): SceneState {
  return {
    ...scene,
    activeNoteId: targetNoteId,
    relationships: scene.relationships.map((relationship) =>
      relationship.id === relationshipId ? { ...relationship, lastActiveAt: now() } : relationship
    )
  };
}
