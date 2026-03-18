import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyLens,
  createProjectLens,
  createRelationshipLens,
  createRevealQueryLens,
  createWorkspaceLens
} from '../scene/lens';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      {
        id: 'r1',
        title: 'Research plan',
        body: 'Alpha plan and beta dependencies',
        anchors: [],
        trace: 'idle',
        x: 0,
        y: 0,
        z: 1,
        createdAt: 1,
        updatedAt: 1,
        archived: false,
        workspaceId: 'research',
        workspaceAffinities: ['research'],
        projectIds: ['atlas']
      },
      {
        id: 'r2',
        title: 'Shared implementation',
        body: 'Alpha implementation note',
        anchors: [],
        trace: 'idle',
        x: 10,
        y: 10,
        z: 2,
        createdAt: 1,
        updatedAt: 1,
        archived: false,
        workspaceId: 'ops',
        workspaceAffinities: ['ops', 'research'],
        projectIds: ['atlas']
      },
      {
        id: 'o1',
        title: 'Ops runbook',
        body: 'Alpha incident drill',
        anchors: [],
        trace: 'idle',
        x: 20,
        y: 20,
        z: 3,
        createdAt: 1,
        updatedAt: 1,
        archived: false,
        workspaceId: 'ops',
        workspaceAffinities: ['ops'],
        projectIds: ['ops-hardening']
      },
      {
        id: 'u1',
        title: 'Loose thought',
        body: 'Unscoped alpha fragment',
        anchors: [],
        trace: 'idle',
        x: 30,
        y: 30,
        z: 4,
        createdAt: 1,
        updatedAt: 1,
        archived: false,
        workspaceId: null,
        workspaceAffinities: [],
        projectIds: []
      }
    ],
    relationships: [
      {
        id: 'rel-1',
        fromId: 'r1',
        toId: 'o1',
        type: 'references',
        state: 'confirmed',
        explicitness: 'explicit',
        confidence: 1,
        explanation: 'Operational impact',
        heuristicSupported: true,
        createdAt: 1,
        lastActiveAt: 1
      }
    ],
    activeNoteId: 'r1',
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    lens: createWorkspaceLens(null),
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

describe('lens selectors', () => {
  it('supports switching between workspace and project lenses', () => {
    const scene = makeScene();

    const workspaceView = applyLens(scene, createWorkspaceLens('research'));
    assert.deepEqual(workspaceView.visibleNotes.map((note) => note.id), ['r1', 'r2']);

    const projectView = applyLens(scene, createProjectLens('atlas', 'research'));
    assert.deepEqual(projectView.visibleNotes.map((note) => note.id), ['r1', 'r2']);
    assert.equal(projectView.activeLensLabel, 'Project · atlas');
  });

  it('applies emphasis and visible context cues for scoped and off-scope notes', () => {
    const scene = makeScene();
    const revealView = applyLens(scene, createRevealQueryLens('alpha', 'research'));

    assert.deepEqual(revealView.visibleNotes.map((note) => note.id), ['r1', 'r2', 'o1', 'u1']);
    assert.deepEqual(revealView.noteStates.r1, { emphasis: 'strong', offScope: false, contextLabel: 'research · atlas' });
    assert.deepEqual(revealView.noteStates.r2, {
      emphasis: 'strong',
      offScope: true,
      contextLabel: 'Shared into research · from ops · atlas'
    });
    assert.deepEqual(revealView.noteStates.o1, {
      emphasis: 'context',
      offScope: true,
      contextLabel: 'Outside research · from ops · ops-hardening'
    });
  });

  it('keeps workspace-scoped views focused while allowing shared-affinity notes in scope', () => {
    const scene = makeScene();
    const workspaceView = applyLens(scene, createWorkspaceLens('research'));

    assert.deepEqual(workspaceView.visibleNotes.map((note) => note.id), ['r1', 'r2']);
    assert.equal(workspaceView.noteStates.r2.offScope, true);
    assert.equal(workspaceView.noteStates.r2.contextLabel, 'Shared into research · from ops · atlas');
  });

  it('surfaces cross-workspace related notes through the relationship lens', () => {
    const originalNow = Date.now;
    Date.now = () => 1;

    try {
      const scene = makeScene();
      const relationshipView = applyLens(scene, createRelationshipLens('r1', 'research'));

      assert.deepEqual(relationshipView.visibleNotes.map((note) => note.id), ['r1', 'o1']);
      assert.deepEqual(relationshipView.noteStates.o1, {
        emphasis: 'context',
        offScope: true,
        contextLabel: 'Outside research · from ops · ops-hardening'
      });
    } finally {
      Date.now = originalNow;
    }
  });

  it('falls back cleanly for notes with no project or workspace affinity', () => {
    const scene = makeScene();

    const universeView = applyLens(scene, createWorkspaceLens(null));
    assert.equal(universeView.noteStates.u1.contextLabel, 'Unscoped');

    const projectView = applyLens(scene, createProjectLens('atlas', null));
    assert.equal(projectView.visibleNotes.map((note) => note.id).includes('u1'), false);

    const revealView = applyLens(scene, createRevealQueryLens('fragment', 'research'));
    assert.deepEqual(revealView.visibleNotes.map((note) => note.id), ['u1']);
    assert.deepEqual(revealView.noteStates.u1, {
      emphasis: 'context',
      offScope: true,
      contextLabel: 'Outside research · from Unscoped'
    });
  });
});
