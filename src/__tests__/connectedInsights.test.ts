import test from 'node:test';
import assert from 'node:assert/strict';
import { runConnectedInsights } from '../ai/connectedInsights';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: 'Launch plan', body: 'Depends on policy and checklist', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: Date.now(), archived: false, deleted: false, deletedAt: null, inFocus: false, isFocus: false, projectIds: ['p1'], inferredProjectIds: [], workspaceId: 'w1', inferredRelationships: [] },
      { id: 'b', title: 'Policy doc', body: 'Reference for launch plan', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 1, updatedAt: Date.now(), archived: false, deleted: false, deletedAt: null, inFocus: false, isFocus: false, projectIds: ['p1'], inferredProjectIds: [], workspaceId: 'w1', inferredRelationships: [] }
    ],
    relationships: [
      { id: 'r1', fromId: 'a', toId: 'b', type: 'depends_on', state: 'confirmed', explicitness: 'explicit', directional: true, confidence: 1, isInferred: false, explanation: 'Launch depends on policy', heuristicSupported: true, createdAt: 1, lastActiveAt: Date.now() }
    ],
    projects: [{ id: 'p1', key: 'SLD', name: 'Ship Launch', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 }],
    workspaces: [{ id: 'w1', key: 'OPS', name: 'Operations', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }],
    isDragging: false,
    activeNoteId: 'a',
    expandedSecondarySurface: 'none',
    captureComposer: { draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { mode: 'ask', query: '', response: null, transcript: [], loading: false, communicationState: 'idle', interactionMode: 'live-stream' },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

test('runConnectedInsights returns graph-grounded results, reasons, and actions', async () => {
  const response = await runConnectedInsights(makeScene(), { query: 'policy', selectedNoteId: 'a', activeProjectIds: ['p1'], visibleNoteIds: ['a', 'b'], mode: 'explore' });
  assert.ok(response.answer.includes('graph'));
  assert.equal(response.results[0].noteId, 'b');
  assert.ok(response.results[0].reasons.some((reason) => reason.includes('direct match') || reason.includes('connected via')));
  assert.ok(response.actions?.some((action) => action.kind === 'focus_cluster'));
  assert.ok(response.actions?.some((action) => action.kind === 'create_link'));
  assert.deepEqual(response.highlightNoteIds, ['b', 'a']);
});
