import { describe, expect, it } from '../test/vitest';
import { applyLens } from '../scene/lens';
import { NoteCardModel } from '../types';

const notes: NoteCardModel[] = [
  { id: 'a', title: null, body: 'A', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 0, updatedAt: 0, archived: false, inFocus: true, projectIds: [] },
  { id: 'b', title: null, body: 'B', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 0, updatedAt: 0, archived: false, inFocus: false, projectIds: [] },
  { id: 'c', title: null, body: 'C', anchors: [], trace: 'idle', x: 0, y: 0, z: 3, createdAt: 0, updatedAt: 0, archived: true, inFocus: true, projectIds: [] }
];

describe('applyLens', () => {
  it('shows only non-archived notes for all lens', () => {
    expect(applyLens(notes, 'all').map((note) => note.id)).toEqual(['a', 'b']);
  });

  it('shows only non-archived focused notes for focus lens', () => {
    expect(applyLens(notes, 'focus').map((note) => note.id)).toEqual(['a']);
  });

  it('shows only archived notes for archive lens', () => {
    expect(applyLens(notes, 'archive').map((note) => note.id)).toEqual(['c']);
  });
});
