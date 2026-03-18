import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLens } from '../scene/lens';
import type { NoteCardModel } from '../types';

const notes: NoteCardModel[] = [
  { id: 'a', title: null, body: 'A', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 0, updatedAt: 0, archived: false, inFocus: true },
  { id: 'b', title: null, body: 'B', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 0, updatedAt: 0, archived: false, inFocus: false },
  { id: 'c', title: null, body: 'C', anchors: [], trace: 'idle', x: 0, y: 0, z: 3, createdAt: 0, updatedAt: 0, archived: true, inFocus: true }
];

test('applyLens shows only non-archived notes for all lens', () => {
  assert.deepEqual(applyLens(notes, 'all').map((note) => note.id), ['a', 'b']);
});

test('applyLens shows only non-archived focused notes for focus lens', () => {
  assert.deepEqual(applyLens(notes, 'focus').map((note) => note.id), ['a']);
});

test('applyLens shows only archived notes for archive lens', () => {
  assert.deepEqual(applyLens(notes, 'archive').map((note) => note.id), ['c']);
});
