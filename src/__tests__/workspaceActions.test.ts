import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceAndAssignToNoteInScene, createWorkspaceInScene, setNoteWorkspaceInScene } from '../workspaces/workspaceActions';
import { getNotesForWorkspace } from '../workspaces/workspaceSelectors';
import type { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'n1', title: null, body: 'alpha', anchors: [], trace: 'idle', x: 40, y: 60, z: 1, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] },
      { id: 'n2', title: null, body: 'beta', anchors: [], trace: 'idle', x: 340, y: 180, z: 2, createdAt: 1, updatedAt: 1, archived: false, deleted: false, deletedAt: null, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] }
    ],
    relationships: [],
    projects: [],
    workspaces: [],
    isDragging: false,
    activeNoteId: null,
    expandedSecondarySurface: 'none',
    captureComposer: { draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { mode: 'ask', query: '', response: null, transcript: [], loading: false },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

test('workspace actions create, assign, and clear scope metadata without imprisoning notes', (t: any) => {
  const ids = ['ws-1', 'ws-2'];
  t.mock.method(globalThis.crypto, 'randomUUID', () => ids.shift() ?? 'ws-x');
  t.mock.method(Date, 'now', () => 15_000);
  const withWorkspace = createWorkspaceInScene(makeScene(), { key: 'ops', name: 'Operations', color: '#229977', description: 'Execution scope' });
  assert.equal(withWorkspace.workspaces[0].key, 'OPS');
  const assigned = createWorkspaceAndAssignToNoteInScene(withWorkspace, 'n1', { key: 'lab', name: 'Lab' });
  assert.equal(assigned.notes[0].workspaceId, 'ws-2');
  const scoped = setNoteWorkspaceInScene(assigned, 'n2', 'ws-1');
  assert.equal(getNotesForWorkspace(scoped.notes, 'ws-1').length, 1);
  const cleared = setNoteWorkspaceInScene(scoped, 'n2', null);
  assert.equal(cleared.notes[1].workspaceId, null);
});
