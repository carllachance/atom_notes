import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProjectAndAssignToNoteInScene,
  createProjectInScene,
  setNoteProjectsInScene,
  setProjectRevealInScene,
  setProjectRevealIsolationInScene
} from '../projects/projectActions';
import { getNotesForProject, getProjectRevealPresentation } from '../projects/projectSelectors';
import type { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'n1', title: null, body: 'alpha', anchors: [], trace: 'idle', x: 40, y: 60, z: 1, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] },
      { id: 'n2', title: null, body: 'beta', anchors: [], trace: 'idle', x: 340, y: 180, z: 2, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] },
      { id: 'n3', title: null, body: 'gamma', anchors: [], trace: 'idle', x: 640, y: 320, z: 3, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] },
      { id: 'n4', title: null, body: 'delta', anchors: [], trace: 'idle', x: 880, y: 420, z: 4, createdAt: 1, updatedAt: 1, archived: false, projectIds: [] }
    ],
    relationships: [],
    projects: [],
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    lens: 'all',
    canvasScrollLeft: 0,
    canvasScrollTop: 0,
    projectReveal: { activeProjectId: null, isolate: false }
  };
}

test('project creation persists stable metadata and supports zero/one/many note memberships', (t: any) => {
  const ids = ['proj-1', 'proj-2'];
  t.mock.method(globalThis.crypto, 'randomUUID', () => ids.shift() ?? 'proj-x');
  t.mock.method(Date, 'now', () => 10_000);

  const withProject = createProjectInScene(makeScene(), {
    key: 'sld',
    name: 'Ship Launch Deck',
    color: '#4455aa',
    description: 'Launch workstream'
  });
  assert.deepEqual(withProject.projects[0], {
    id: 'proj-1',
    key: 'SLD',
    name: 'Ship Launch Deck',
    color: '#4455aa',
    description: 'Launch workstream',
    createdAt: 10_000,
    updatedAt: 10_000
  });

  const assignedViaCreate = createProjectAndAssignToNoteInScene(withProject, 'n1', { key: 'ops', name: 'Operations' });
  assert.deepEqual(assignedViaCreate.notes[0].projectIds, ['proj-2']);

  const membershipScene = {
    ...assignedViaCreate,
    notes: assignedViaCreate.notes.map((note) =>
      note.id === 'n1'
        ? { ...note, projectIds: [] }
        : note
    )
  };
  const singleMembership = setNoteProjectsInScene(membershipScene, 'n1', ['proj-1']);
  assert.deepEqual(singleMembership.notes[0].projectIds, ['proj-1']);

  const manyMembership = setNoteProjectsInScene(singleMembership, 'n1', ['proj-1', 'proj-2', 'missing', 'proj-1']);
  assert.deepEqual(manyMembership.notes[0].projectIds, ['proj-1', 'proj-2']);

  const zeroMembership = setNoteProjectsInScene(manyMembership, 'n1', []);
  assert.deepEqual(zeroMembership.notes[0].projectIds, []);
  assert.equal(getNotesForProject(manyMembership.notes, 'proj-1').length, 1);
});

test('project reveal switches cleanly and clears stale highlight/group state when project changes', () => {
  const scene = {
    ...makeScene(),
    projects: [
      { id: 'pA', key: 'SLD', name: 'Ship Launch Deck', color: '#4455aa', description: '', createdAt: 1, updatedAt: 1 },
      { id: 'pB', key: 'OPS', name: 'Operations', color: '#229977', description: '', createdAt: 1, updatedAt: 1 }
    ],
    notes: [
      { ...makeScene().notes[0], projectIds: ['pA'] },
      { ...makeScene().notes[1], projectIds: ['pA', 'pB'] },
      { ...makeScene().notes[2], projectIds: ['pB'] },
      { ...makeScene().notes[3], projectIds: [] }
    ]
  };

  const revealA = setProjectRevealInScene(scene, 'pA');
  const presentationA = getProjectRevealPresentation(revealA, revealA.notes);
  assert.deepEqual(presentationA.highlightedNoteIds, ['n1', 'n2']);
  assert.deepEqual(presentationA.subordinateNoteIds, ['n3', 'n4']);
  assert.equal(presentationA.connectorSegments.length, 1);

  const revealB = setProjectRevealInScene(revealA, 'pB');
  const presentationB = getProjectRevealPresentation(revealB, revealB.notes);
  assert.deepEqual(presentationB.highlightedNoteIds, ['n2', 'n3']);
  assert.deepEqual(presentationB.subordinateNoteIds, ['n1', 'n4']);
  assert.equal(presentationB.connectorSegments.length, 1);
  assert.equal(presentationB.highlightedNoteIds.includes('n1'), false);

  const isolated = setProjectRevealIsolationInScene(revealB, true);
  const isolatedPresentation = getProjectRevealPresentation(isolated, isolated.notes);
  assert.deepEqual(isolatedPresentation.visibleNotes.map((note) => note.id), ['n2', 'n3']);

  const cleared = setProjectRevealInScene(isolated, null);
  const clearedPresentation = getProjectRevealPresentation(cleared, cleared.notes);
  assert.deepEqual(clearedPresentation.highlightedNoteIds, []);
  assert.deepEqual(clearedPresentation.connectorSegments, []);
});
