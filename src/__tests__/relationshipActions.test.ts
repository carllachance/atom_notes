import test from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmRelationshipInScene,
  createExplicitRelationshipInScene,
  createInlineLinkedNoteInScene,
  promoteNoteFragmentToTaskInScene,
  removeRelationshipInScene,
  restoreRelationshipInScene,
  setTaskStateInScene,
  traverseToRelatedInScene,
  updateRelationshipInScene
} from '../relationships/relationshipActions';
import type { SceneState } from '../types';

function baseScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: null, body: 'A', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] },
      { id: 'b', title: null, body: 'B', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] }
    ],
    relationships: [],
    projects: [],
    workspaces: [],
    isDragging: false,
    activeNoteId: null,
    quickCaptureOpen: false,
    captureComposer: { open: false, draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { state: 'hidden', mode: 'ask', query: '', response: null, transcript: [], loading: false },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

test('relationshipActions creates explicit relationship and prevents duplicate explicit links', (t: any) => {
  t.mock.method(Date, 'now', () => 100);
  t.mock.method(globalThis.crypto, 'randomUUID', () => 'rel-1');
  const scene1 = createExplicitRelationshipInScene(baseScene(), 'a', 'b', 'references');
  assert.equal(scene1.relationships.some((r) => r.id === 'rel-1' && r.explicitness === 'explicit'), true);
  assert.deepEqual(scene1.insightTimeline?.map((entry) => entry.title), ['Linked to B', 'Connected with A']);
  const scene2 = createExplicitRelationshipInScene(scene1, 'a', 'b', 'references');
  assert.equal(scene2, scene1);
});

test('relationshipActions confirms and traverses relationships deterministically', (t: any) => {
  t.mock.method(Date, 'now', () => 200);
  const scene = {
    ...baseScene(),
    relationships: [{ id: 'rel-x', fromId: 'a', toId: 'b', type: 'related' as const, state: 'proposed' as const, explicitness: 'inferred' as const, directional: false, confidence: 0.5, isInferred: true, explanation: 'Shared keyword', heuristicSupported: false, createdAt: 10, lastActiveAt: 10 }]
  };
  const confirmed = confirmRelationshipInScene(scene, 'rel-x');
  assert.deepEqual(confirmed.relationships[0], { ...scene.relationships[0], state: 'confirmed', heuristicSupported: true, isInferred: true, lastActiveAt: 200 });
  const traversed = traverseToRelatedInScene(confirmed, 'b', 'rel-x');
  assert.equal(traversed.activeNoteId, 'b');
  assert.equal(traversed.aiPanel.state, 'open');
  assert.equal(traversed.relationships[0].lastActiveAt, 200);
});

test('relationshipActions updates a relationship in place and reconciles inferred duplicates', (t: any) => {
  t.mock.method(Date, 'now', () => 300);
  const scene = {
    ...baseScene(),
    relationships: [
      { id: 'rel-edit', fromId: 'a', toId: 'b', type: 'references' as const, state: 'confirmed' as const, explicitness: 'inferred' as const, directional: true, confidence: 0.8, isInferred: true, explanation: 'Shared source', heuristicSupported: true, createdAt: 10, lastActiveAt: 10 },
      { id: 'rel-dup', fromId: 'a', toId: 'b', type: 'related' as const, state: 'proposed' as const, explicitness: 'inferred' as const, directional: false, confidence: 0.5, isInferred: true, explanation: 'Shared keyword', heuristicSupported: true, createdAt: 11, lastActiveAt: 11 }
    ]
  };

  const updated = updateRelationshipInScene(scene, 'rel-edit', 'depends_on', 'b', 'a');
  assert.equal(updated.relationships.length, 1);
  assert.deepEqual(updated.relationships[0], {
    ...scene.relationships[0],
    fromId: 'b',
    toId: 'a',
    type: 'depends_on',
    directional: true,
    state: 'confirmed',
    explicitness: 'explicit',
    confidence: 1,
    isInferred: false,
    explanation: 'Edited in the relationship inspector.',
    heuristicSupported: true,
    lastActiveAt: 300
  });
});

test('relationshipActions can restore the prior relationship snapshot for undo', (t: any) => {
  t.mock.method(Date, 'now', () => 400);
  const editedScene = {
    ...baseScene(),
    relationships: [
      { id: 'rel-edit', fromId: 'b', toId: 'a', type: 'depends_on' as const, state: 'confirmed' as const, explicitness: 'explicit' as const, directional: true, confidence: 1, isInferred: false, explanation: 'Edited in the relationship inspector.', heuristicSupported: true, createdAt: 10, lastActiveAt: 300 }
    ]
  };
  const snapshot = { id: 'rel-edit', fromId: 'a', toId: 'b', type: 'references' as const, state: 'confirmed' as const, explicitness: 'inferred' as const, directional: true, confidence: 0.8, isInferred: true, explanation: 'Shared source', heuristicSupported: true, createdAt: 10, lastActiveAt: 10 };

  const restored = restoreRelationshipInScene(editedScene, snapshot);
  assert.equal(restored.relationships.some((relationship) => relationship.id === 'rel-edit' && relationship.type === 'references' && relationship.explicitness === 'inferred'), true);
});

test('relationshipActions removes explicit links without touching inferred relationships', (t: any) => {
  t.mock.method(Date, 'now', () => 450);
  const scene = {
    ...baseScene(),
    relationships: [
      { id: 'rel-explicit', fromId: 'a', toId: 'b', type: 'references' as const, state: 'confirmed' as const, explicitness: 'explicit' as const, directional: true, confidence: 1, isInferred: false, explanation: 'Manual link', heuristicSupported: true, createdAt: 10, lastActiveAt: 10 },
      { id: 'rel-inferred', fromId: 'a', toId: 'b', type: 'related' as const, state: 'proposed' as const, explicitness: 'inferred' as const, directional: false, confidence: 0.6, isInferred: true, explanation: 'Shared keyword', heuristicSupported: true, createdAt: 11, lastActiveAt: 11 }
    ]
  };

  const removed = removeRelationshipInScene(scene, 'rel-explicit');
  assert.equal(removed.relationships.some((relationship) => relationship.id === 'rel-explicit'), false);
  assert.equal(removed.relationships.some((relationship) => relationship.explicitness === 'explicit'), false);
});

test('relationshipActions creates a new linked note inline and inherits the active context', (t: any) => {
  t.mock.method(Date, 'now', () => 500);
  t.mock.method(globalThis.crypto, 'randomUUID', () => 'inline-note');
  const scene = {
    ...baseScene(),
    notes: [
      {
        ...baseScene().notes[0],
        projectIds: ['project-1'],
        workspaceId: 'workspace-1',
        x: 120,
        y: 180
      },
      baseScene().notes[1]
    ]
  };

  const result = createInlineLinkedNoteInScene(scene, 'a', 'New linked note', 'supports');
  assert.equal(result.targetNoteId, 'inline-note');
  assert.equal(result.scene.notes.length, 3);
  assert.deepEqual(result.scene.notes[2], {
    id: 'inline-note',
    title: 'New linked note',
    body: '',
    anchors: [],
    trace: 'linked',
    x: 440,
    y: 216,
    z: 3,
    createdAt: 500,
    updatedAt: 500,
    archived: false, deleted: false, deletedAt: null,
    inFocus: false,
    isFocus: false,
    projectIds: ['project-1'],
    inferredProjectIds: [],
    workspaceId: 'workspace-1',
    taskState: undefined,
    taskSource: null,
    promotedTaskFragments: [],
    intent: undefined,
    intentConfidence: undefined,
    inferredRelationships: [],
    attachments: []
  });
  assert.equal(result.scene.relationships.some((relationship) => relationship.fromId === 'a' && relationship.toId === 'inline-note' && relationship.type === 'supports'), true);
});

test('relationshipActions promotes a source fragment into a task with provenance and derived link', (t: any) => {
  t.mock.method(Date, 'now', () => 700);
  const uuids = ['task-note', 'promotion-id'];
  t.mock.method(globalThis.crypto, 'randomUUID', () => uuids.shift() as string);
  const scene = {
    ...baseScene(),
    notes: [
      { ...baseScene().notes[0], body: 'Review the release checklist before ship.', projectIds: ['project-1'], workspaceId: 'workspace-1', x: 40, y: 60 },
      baseScene().notes[1]
    ]
  };

  const promoted = promoteNoteFragmentToTaskInScene(scene, 'a', {
    start: 11,
    end: 32,
    text: 'release checklist'
  });

  assert.equal(promoted.taskNoteId, 'task-note');
  assert.equal(promoted.promotionId, 'promotion-id');
  assert.deepEqual(promoted.scene.notes.find((note) => note.id === 'task-note')?.taskSource, {
    sourceNoteId: 'a',
    promotionId: 'promotion-id',
    start: 11,
    end: 32,
    text: 'release checklist',
    createdAt: 700
  });
  assert.deepEqual(promoted.scene.notes.find((note) => note.id === 'a')?.promotedTaskFragments, [{
    id: 'promotion-id',
    taskNoteId: 'task-note',
    start: 11,
    end: 32,
    text: 'release checklist',
    createdAt: 700
  }]);
  assert.equal(promoted.scene.relationships.some((relationship) => relationship.fromId === 'task-note' && relationship.toId === 'a' && relationship.type === 'derived_from'), true);
});

test('relationshipActions updates task state without breaking linked context', (t: any) => {
  t.mock.method(Date, 'now', () => 910);
  const scene = {
    ...baseScene(),
    notes: [
      { ...baseScene().notes[0], intent: 'task' as const, taskState: 'open' as const },
      baseScene().notes[1]
    ],
    relationships: [
      { id: 'rel-task', fromId: 'a', toId: 'b', type: 'derived_from' as const, state: 'confirmed' as const, explicitness: 'explicit' as const, directional: true, confidence: 1, isInferred: false, explanation: 'Promoted from source fragment.', heuristicSupported: true, createdAt: 12, lastActiveAt: 12 }
    ]
  };

  const updated = setTaskStateInScene(scene, 'a', 'done');
  assert.equal(updated.notes[0].taskState, 'done');
  assert.equal(updated.relationships[0].lastActiveAt, 910);
});
