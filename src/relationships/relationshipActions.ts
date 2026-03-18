import { now } from '../notes/noteModel';
import { isRelationshipTypeDirectional, refreshInferredRelationships, relationshipNodePairKey, relationshipPairKey } from '../relationshipLogic';
import { Relationship, RelationshipType, SceneState } from '../types';

function reconcileRelationships(scene: SceneState, updatedRelationship: Relationship) {
  const updatedPairKey = relationshipPairKey(
    updatedRelationship.fromId,
    updatedRelationship.toId,
    updatedRelationship.type,
    updatedRelationship.directional
  );
  const updatedNodePairKey = relationshipNodePairKey(updatedRelationship.fromId, updatedRelationship.toId);

  const relationships = scene.relationships
    .filter((relationship) => relationship.id !== updatedRelationship.id)
    .filter((relationship) => {
      const pairKey = relationshipPairKey(relationship.fromId, relationship.toId, relationship.type, relationship.directional);
      if (pairKey === updatedPairKey) return false;
      if (relationship.explicitness === 'inferred' && relationshipNodePairKey(relationship.fromId, relationship.toId) === updatedNodePairKey) {
        return false;
      }
      return true;
    })
    .concat(updatedRelationship);

  return { ...scene, relationships: refreshInferredRelationships(scene.notes, relationships, now()) };
}

export function createExplicitRelationshipInScene(
  scene: SceneState,
  fromId: string,
  toId: string,
  type: RelationshipType
): SceneState {
  const directional = isRelationshipTypeDirectional(type);
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

  return reconcileRelationships(scene, explicitRelationship);
}

export function updateRelationshipInScene(
  scene: SceneState,
  relationshipId: string,
  type: RelationshipType,
  fromId: string,
  toId: string
): SceneState {
  const existing = scene.relationships.find((relationship) => relationship.id === relationshipId);
  if (!existing) return scene;

  const directional = isRelationshipTypeDirectional(type);
  const editedRelationship: Relationship = {
    ...existing,
    fromId,
    toId,
    type,
    directional,
    state: 'confirmed',
    explicitness: 'explicit',
    isInferred: false,
    confidence: 1,
    explanation: 'Edited in the relationship inspector.',
    heuristicSupported: true,
    lastActiveAt: now()
  };

  return reconcileRelationships(scene, editedRelationship);
}

export function restoreRelationshipInScene(scene: SceneState, snapshot: Relationship): SceneState {
  return reconcileRelationships(scene, snapshot);
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
