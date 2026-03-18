import test from 'node:test';
import assert from 'node:assert/strict';
import { runConnectedInsights } from '../ai/connectedInsights';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: 'Launch plan', body: 'Depends on policy and checklist', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: Date.now(), archived: false, inFocus: false, isFocus: false, projectIds: ['p1'], inferredProjectIds: [], workspaceId: 'w1', inferredRelationships: [] },
      { id: 'b', title: 'Policy doc', body: 'Reference for launch plan', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 1, updatedAt: Date.now(), archived: false, inFocus: false, isFocus: false, projectIds: ['p1'], inferredProjectIds: [], workspaceId: 'w1', inferredRelationships: [] }
    ],
    relationships: [
      { id: 'r1', fromId: 'a', toId: 'b', type: 'depends_on', state: 'confirmed', explicitness: 'explicit', directional: true, confidence: 1, isInferred: false, explanation: 'Launch depends on policy', heuristicSupported: true, createdAt: 1, lastActiveAt: Date.now() }
    ],
    projects: [{ id: 'p1', key: 'SLD', name: 'Ship Launch', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 }],
    workspaces: [{ id: 'w1', key: 'OPS', name: 'Operations', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }],
    activeNoteId: 'a',
    quickCaptureOpen: false,
    captureComposer: { open: false, draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { state: 'hidden', mode: 'ask', query: '', response: null, loading: false },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

test('runConnectedInsights returns graph-grounded results, reasons, and actions', async () => {
  const response = await runConnectedInsights(makeScene(), { query: 'policy', selectedNoteId: 'a', activeProjectIds: ['p1'], visibleNoteIds: ['a', 'b'], mode: 'explore' });
  assert.ok(response.answer.includes('relevant notes'));
  assert.equal(response.results[0].noteId, 'b');
  assert.ok(response.results[0].reasons.some((reason) => reason.includes('direct match') || reason.includes('connected via')));
  assert.ok(response.actions?.some((action) => action.kind === 'focus_cluster'));
});
