import { describe, expect, it } from 'vitest';
import { getResetViewTarget, getSelectedClusterTarget } from '../canvas/navigation';
import { NoteCardModel } from '../types';

function makeNote(id: string, x: number, y: number): NoteCardModel {
  return {
    id,
    title: id,
    body: id,
    anchors: [],
    trace: 'idle',
    x,
    y,
    z: 1,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    inFocus: false
  };
}

describe('canvas navigation helpers', () => {
  it('centers a selected cluster when related context exists', () => {
    const notes = [makeNote('active', 100, 100), makeNote('related', 500, 260), makeNote('far', 1600, 1400)];
    const target = getSelectedClusterTarget('active', notes, ['related']);

    expect(target).toMatchObject({ pulseNoteId: 'active' });
    expect(target!.x).toBeGreaterThan(300);
    expect(target!.x).toBeLessThan(700);
    expect(target!.y).toBeGreaterThan(150);
    expect(target!.y).toBeLessThan(450);
  });

  it('falls back to the visible canvas center for reset orientation', () => {
    const notes = [makeNote('a', 20, 30), makeNote('b', 320, 430)];
    const resetTarget = getResetViewTarget(notes);

    expect(resetTarget).toMatchObject({ pulseNoteId: null });
    expect(resetTarget!.x).toBeGreaterThan(150);
    expect(resetTarget!.y).toBeGreaterThan(180);
  });
});
