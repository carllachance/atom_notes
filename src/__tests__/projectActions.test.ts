import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectAndAssignToNoteInScene, createProjectInScene, setNoteProjectsInScene } from '../projects/projectActions';
import { buildSparseProjectConnectorSegments, getNotesForProject } from '../projects/projectSelectors';
import type { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'n1', title: null, body: 'alpha', anchors: [], trace: 'idle', x: 40, y: 60, z: 1, createdAt: 1, updatedAt: 1, archived: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] },
      { id: 'n2', title: null, body: 'beta', anchors: [], trace: 'idle', x: 340, y: 180, z: 2, createdAt: 1, updatedAt: 1, archived: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] },
      { id: 'n3', title: null, body: 'gamma', anchors: [], trace: 'idle', x: 640, y: 320, z: 3, createdAt: 1, updatedAt: 1, archived: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] },
      { id: 'n4', title: null, body: 'delta', anchors: [], trace: 'idle', x: 880, y: 420, z: 4, createdAt: 1, updatedAt: 1, archived: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] }
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

test('project creation persists stable metadata and supports zero/one/many note memberships', (t: any) => {
  const ids = ['proj-1', 'proj-2'];
  t.mock.method(globalThis.crypto, 'randomUUID', () => ids.shift() ?? 'proj-x');
  t.mock.method(Date, 'now', () => 10_000);
  const withProject = createProjectInScene(makeScene(), { key: 'sld', name: 'Ship Launch Deck', color: '#4455aa', description: 'Launch workstream' });
  assert.equal(withProject.projects[0].key, 'SLD');
  const assignedViaCreate = createProjectAndAssignToNoteInScene(withProject, 'n1', { key: 'ops', name: 'Operations' });
  assert.deepEqual(assignedViaCreate.notes[0].projectIds, ['proj-2']);
  const singleMembership = setNoteProjectsInScene(assignedViaCreate, 'n1', ['proj-1']);
  assert.deepEqual(singleMembership.notes[0].projectIds, ['proj-1']);
  const manyMembership = setNoteProjectsInScene(singleMembership, 'n1', ['proj-1', 'proj-2', 'missing', 'proj-1']);
  assert.deepEqual(manyMembership.notes[0].projectIds, ['proj-1', 'proj-2']);
  assert.equal(getNotesForProject(manyMembership.notes, 'proj-1').length, 1);
});

test('project selectors build sparse connector segments for highlighted project families', () => {
  const scene = { ...makeScene(), notes: [{ ...makeScene().notes[0], projectIds: ['pA'] }, { ...makeScene().notes[1], projectIds: ['pA'] }, { ...makeScene().notes[2], projectIds: ['pA'] }, { ...makeScene().notes[3], projectIds: [] }] };
  const segments = buildSparseProjectConnectorSegments(scene.notes.filter((note) => note.projectIds.includes('pA')));
  assert.equal(segments.length, 2);
});
