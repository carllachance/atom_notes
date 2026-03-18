import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLens } from '../scene/lens';

const notes = [
  { id: 'a', title: null, body: 'A', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 0, updatedAt: 0, archived: false, inFocus: true, projectIds: [] },
  { id: 'b', title: null, body: 'B', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 0, updatedAt: 0, archived: false, inFocus: false, projectIds: [] },
  { id: 'c', title: null, body: 'C', anchors: [], trace: 'idle', x: 0, y: 0, z: 3, createdAt: 0, updatedAt: 0, archived: true, inFocus: false, projectIds: [] }
];

test('applyLens filters notes for canvas, focus, and archive views', () => {
  assert.deepEqual(applyLens(notes, 'all').map((note) => note.id), ['a', 'b']);
  assert.deepEqual(applyLens(notes, 'focus').map((note) => note.id), ['a']);
  assert.deepEqual(applyLens(notes, 'archive').map((note) => note.id), ['c']);
});
