import { appendInsightTimelineEntries, createRelationshipConfirmationTimelineEntries, createRelationshipTimelineEntries } from '../insights/insightTimeline';
import { createNote, now } from '../notes/noteModel';
import { getDisplayTitle, normalizeOptionalTitle } from '../noteText';
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
  type: RelationshipType,
  explanation = 'Linked inline while writing.'
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
    explanation,
    heuristicSupported: true,
    createdAt: existing?.createdAt ?? now(),
    lastActiveAt: now()
  };

  const nextScene = reconcileRelationships(scene, explicitRelationship);
  return appendInsightTimelineEntries(nextScene, createRelationshipTimelineEntries(nextScene, explicitRelationship, { createdAt: explicitRelationship.lastActiveAt }));
}

export function createInlineLinkedNoteInScene(
  scene: SceneState,
  sourceNoteId: string,
  title: string,
  type: RelationshipType
): { scene: SceneState; targetNoteId: string | null } {
  const source = scene.notes.find((note) => note.id === sourceNoteId);
  const normalizedTitle = normalizeOptionalTitle(title);
  if (!source || !normalizedTitle) return { scene, targetNoteId: null };

  const existing = scene.notes.find(
    (note) => !note.archived && note.id !== sourceNoteId && getDisplayTitle(note).trim().toLowerCase() === normalizedTitle.toLowerCase()
  );

  if (existing) {
    return {
      scene: createExplicitRelationshipInScene(scene, sourceNoteId, existing.id, type),
      targetNoteId: existing.id
    };
  }

  const created = createNote(normalizedTitle, scene.notes.reduce((acc, note) => Math.max(acc, note.z), 0) + 1, source.projectIds, source.workspaceId, {
    x: source.x + 320,
    y: source.y + 36
  });
  created.trace = 'linked';
  const sceneWithNote = { ...scene, notes: [...scene.notes, created] };

  return {
    scene: createExplicitRelationshipInScene(sceneWithNote, sourceNoteId, created.id, type),
    targetNoteId: created.id
  };
}

export function promoteNoteFragmentToTaskInScene(
  scene: SceneState,
  sourceNoteId: string,
  selection: { start: number; end: number; text: string }
): { scene: SceneState; taskNoteId: string | null; promotionId: string | null } {
  const source = scene.notes.find((note) => note.id === sourceNoteId);
  const normalizedText = selection.text.replace(/\s+/g, ' ').trim();
  if (!source || !normalizedText || selection.end <= selection.start) {
    return { scene, taskNoteId: null, promotionId: null };
  }

  const task = createNote(normalizedText, scene.notes.reduce((acc, note) => Math.max(acc, note.z), 0) + 1, source.projectIds, source.workspaceId, {
    x: source.x + 340,
    y: source.y + 44
  });
  const promotionId = crypto.randomUUID();
  task.trace = 'linked';
  task.intent = 'task';
  task.intentConfidence = 1;
  task.taskState = 'open';
  task.taskSource = {
    sourceNoteId,
    promotionId,
    start: selection.start,
    end: selection.end,
    text: selection.text,
    createdAt: now()
  };

  const notes = scene.notes.map((note) =>
    note.id === sourceNoteId
      ? {
          ...note,
          promotedTaskFragments: [
            ...(note.promotedTaskFragments ?? []),
            {
              id: promotionId,
              taskNoteId: task.id,
              start: selection.start,
              end: selection.end,
              text: selection.text,
              createdAt: now()
            }
          ]
        }
      : note
  ).concat(task);

  const nextScene = createExplicitRelationshipInScene(
    { ...scene, notes },
    task.id,
    sourceNoteId,
    'derived_from',
    'Promoted from a highlighted source fragment.'
  );

  return {
    scene: {
      ...nextScene,
      activeNoteId: sourceNoteId
    },
    taskNoteId: task.id,
    promotionId
  };
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

  const nextScene = reconcileRelationships(scene, editedRelationship);
  return appendInsightTimelineEntries(nextScene, createRelationshipTimelineEntries(nextScene, editedRelationship, { createdAt: editedRelationship.lastActiveAt, title: 'Refined connection', detail: 'Relationship details were edited to better reflect the structure.' }));
}

export function restoreRelationshipInScene(scene: SceneState, snapshot: Relationship): SceneState {
  return reconcileRelationships(scene, snapshot);
}

export function removeRelationshipInScene(scene: SceneState, relationshipId: string): SceneState {
  const relationship = scene.relationships.find((candidate) => candidate.id === relationshipId);
  if (!relationship || relationship.explicitness !== 'explicit') return scene;

  return {
    ...scene,
    relationships: refreshInferredRelationships(
      scene.notes,
      scene.relationships.filter((candidate) => candidate.id !== relationshipId),
      now()
    )
  };
}

export function confirmRelationshipInScene(scene: SceneState, relationshipId: string): SceneState {
  const confirmedAt = now();
  const relationships: Relationship[] = scene.relationships.map((relationship) =>
    relationship.id === relationshipId
      ? { ...relationship, state: 'confirmed' as const, lastActiveAt: confirmedAt, heuristicSupported: true, isInferred: true }
      : relationship
  );
  const confirmedRelationship = relationships.find((relationship) => relationship.id === relationshipId);
  const nextScene = { ...scene, relationships };
  return confirmedRelationship
    ? appendInsightTimelineEntries(nextScene, createRelationshipConfirmationTimelineEntries(nextScene, confirmedRelationship))
    : nextScene;
}

export function traverseToRelatedInScene(scene: SceneState, targetNoteId: string, relationshipId: string): SceneState {
  return {
    ...scene,
    activeNoteId: targetNoteId,
    aiPanel: { ...scene.aiPanel, state: 'open' },
    relationships: scene.relationships.map((relationship) =>
      relationship.id === relationshipId ? { ...relationship, lastActiveAt: now() } : relationship
    )
  };
}

export function setTaskStateInScene(scene: SceneState, noteId: string, taskState: 'open' | 'done'): SceneState {
  const touchedAt = now();
  const notes = scene.notes.map((note) =>
    note.id === noteId ? { ...note, intent: 'task' as const, taskState, updatedAt: touchedAt, trace: 'refined' } : note
  );

  return {
    ...scene,
    notes,
    relationships: scene.relationships.map((relationship) =>
      relationship.fromId === noteId || relationship.toId === noteId ? { ...relationship, lastActiveAt: touchedAt } : relationship
    )
  };
}
