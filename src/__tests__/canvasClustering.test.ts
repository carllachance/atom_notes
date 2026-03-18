import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CLUSTER_FORCES, stepClusterState, syncClusterState } from '../components/canvasClustering';
import { Relationship } from '../types';

const notes: Array<{ id: string; x: number; y: number }> = [
  { id: 'a', x: 0, y: 0 },
  { id: 'b', x: 320, y: 0 },
  { id: 'c', x: 96, y: 0 }
];

function connected(fromId: string, toId: string): Relationship {
  return {
    id: `${fromId}-${toId}`,
    fromId,
    toId,
    type: 'related',
    state: 'confirmed',
    explicitness: 'explicit',
    directional: false,
    explanation: 'linked',
    heuristicSupported: false,
    createdAt: 1,
    lastActiveAt: 1
  };
}

test('connected notes drift together while nearby unconnected notes drift apart', () => {
  let state = syncClusterState(notes);

  for (let step = 0; step < 120; step += 1) {
    state = stepClusterState(notes, [connected('a', 'b')], state);
  }

  const connectedDistance = state.b.x - state.a.x;
  assert.ok(connectedDistance < notes[1].x - notes[0].x, 'connected notes should move slightly closer');
  assert.ok(state.c.x > notes[2].x, 'unconnected notes should gain a little breathing room');
});

test('anchor spring and offset cap preserve manual layout dominance', () => {
  const displaced = syncClusterState([{ id: 'solo', x: 180, y: 120 }]);
  displaced.solo.x += 60;
  displaced.solo.y += 60;

  const next = stepClusterState([{ id: 'solo', x: 180, y: 120 }], [], displaced);
  const offset = Math.hypot(next.solo.x - 180, next.solo.y - 120);

  assert.ok(offset <= DEFAULT_CLUSTER_FORCES.maxOffset + 0.0001);
  assert.ok(next.solo.x < displaced.solo.x);
  assert.ok(next.solo.y < displaced.solo.y);
});

test('strong damping keeps per-frame motion slow and controlled', () => {
  let state = syncClusterState(notes);
  state = stepClusterState(notes, [connected('a', 'b')], state);

  const speedA = Math.hypot(state.a.vx, state.a.vy);
  const speedB = Math.hypot(state.b.vx, state.b.vy);

  assert.ok(speedA <= DEFAULT_CLUSTER_FORCES.maxSpeed + 0.0001);
  assert.ok(speedB <= DEFAULT_CLUSTER_FORCES.maxSpeed + 0.0001);
  assert.ok(DEFAULT_CLUSTER_FORCES.damping < 0.8);
});

test('dragged nodes ignore clustering forces until released', () => {
  const displaced = syncClusterState(notes);
  displaced.a.x += 24;

  const next = stepClusterState(notes, [connected('a', 'b')], displaced, {}, {
    forceScaleById: { a: 0 }
  });

  assert.equal(next.a.x, notes[0].x);
  assert.equal(next.a.y, notes[0].y);
  assert.equal(next.a.vx, 0);
  assert.equal(next.a.vy, 0);
  assert.equal(next.b.x, displaced.b.x);
});

test('released nodes rejoin clustering gradually and stay close to manual anchors', () => {
  const previous = syncClusterState(notes);
  previous.a.x += 18;

  const softRelease = stepClusterState(notes, [connected('a', 'b')], previous, {}, {
    forceScaleById: { a: 0.25 }
  });
  const fullRelease = stepClusterState(notes, [connected('a', 'b')], previous, {}, {
    forceScaleById: { a: 1 }
  });

  const softOffset = Math.hypot(softRelease.a.x - notes[0].x, softRelease.a.y - notes[0].y);
  const fullOffset = Math.hypot(fullRelease.a.x - notes[0].x, fullRelease.a.y - notes[0].y);
  const softSpeed = Math.hypot(softRelease.a.vx, softRelease.a.vy);
  const fullSpeed = Math.hypot(fullRelease.a.vx, fullRelease.a.vy);

  assert.ok(softOffset <= fullOffset, 'early release should stay closer to the user anchor');
  assert.ok(softSpeed <= fullSpeed, 'early release should move more gently than full clustering');
  assert.ok(softOffset <= DEFAULT_CLUSTER_FORCES.maxOffset * 0.6 + 0.0001);
});


test('focus mode pulls focused notes toward center and softens non-focus positions', () => {
  const focusNotes = [
    { id: 'focus-a', x: 0, y: 40 },
    { id: 'focus-b', x: 360, y: 60 },
    { id: 'context', x: 160, y: 40 }
  ];

  let state = syncClusterState(focusNotes);

  for (let step = 0; step < 120; step += 1) {
    state = stepClusterState(focusNotes, [], state, {}, {
      focusModeActive: true,
      focusNoteIds: ['focus-a', 'focus-b'],
      viewportCenter: { x: 180, y: 50 }
    });
  }

  assert.ok(state['focus-a'].x > focusNotes[0].x, 'focused note should drift inward from the left');
  assert.ok(state['focus-b'].x < focusNotes[1].x, 'focused note should drift inward from the right');
  assert.ok(state.context.y < focusNotes[2].y, 'non-focus note should ease outward from the focus center');
});


test('hover micro-clustering gently pulls direct neighbors inward without dragging unrelated notes', () => {
  const hoverNotes = [
    { id: 'hovered', x: 0, y: 0 },
    { id: 'linked', x: 320, y: 0 },
    { id: 'distant', x: 160, y: 180 }
  ];

  let state = syncClusterState(hoverNotes);

  for (let step = 0; step < 90; step += 1) {
    state = stepClusterState(hoverNotes, [connected('hovered', 'linked')], state, {}, {
      hoveredNoteId: 'hovered'
    });
  }

  const linkedDistance = state.linked.x - state.hovered.x;
  const originalDistance = hoverNotes[1].x - hoverNotes[0].x;
  const unrelatedDrift = Math.hypot(state.distant.x - hoverNotes[2].x, state.distant.y - hoverNotes[2].y);

  assert.ok(linkedDistance < originalDistance, 'hovered neighbors should ease closer together');
  assert.ok(unrelatedDrift <= 0.75, 'unrelated notes should remain nearly fixed during hover clustering');
});
