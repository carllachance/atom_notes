import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCanvasVisibility } from '../scene/canvasVisibility';
import type { NoteCardModel, SceneState } from '../types';

function makeNote(id: string, overrides: Partial<NoteCardModel> = {}): NoteCardModel {
  return {
    id,
    title: id,
    body: `${id} body`,
    anchors: [],
    trace: 'idle',
    x: 100,
    y: 100,
    z: 1,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    deleted: false,
    deletedAt: null,
    inFocus: false,
    isFocus: false,
    projectIds: [],
    inferredProjectIds: [],
    workspaceId: null,
    inferredRelationships: [],
    ...overrides
  };
}

function makeScene(notes: NoteCardModel[], focusMode: SceneState['focusMode'] = { highlight: true, isolate: false }): Pick<SceneState, 'notes' | 'focusMode'> {
  return { notes, focusMode };
}

test('flags focus-only blank states separately from true empty universes', () => {
  const notes = [makeNote('a', { isFocus: false }), makeNote('b', { isFocus: false, x: 420 })];
  const summary = summarizeCanvasVisibility(
    makeScene(notes, { highlight: true, isolate: true }),
    { visibleNotes: notes },
    [],
    null
  );

  assert.equal(summary.totalActiveNotes, 2);
  assert.equal(summary.hiddenByFocusCount, 2);
  assert.equal(summary.isBlankBecauseOfFocus, true);
  assert.equal(summary.isBlankBecauseOfFilters, false);
  assert.equal(summary.shouldShowRecoveryHelper, true);
});

test('detects off-canvas notes when the render set exists but the viewport misses it', () => {
  const notes = [makeNote('a', { x: 1200, y: 900 })];
  const summary = summarizeCanvasVisibility(
    makeScene(notes),
    { visibleNotes: notes },
    notes,
    {
      left: 0,
      top: 0,
      scrollLeft: 0,
      scrollTop: 0,
      width: 600,
      height: 500
    }
  );

  assert.equal(summary.visibleNotes, 1);
  assert.equal(summary.notesInViewport, 0);
  assert.equal(summary.isBlankBecauseNotesAreOffCanvas, true);
  assert.equal(summary.shouldShowRecoveryHelper, true);
});

test('treats lens-filtered zero states as recoverable when notes still exist elsewhere', () => {
  const universeNotes = [makeNote('a'), makeNote('b', { x: 420 })];
  const summary = summarizeCanvasVisibility(
    makeScene(universeNotes),
    { visibleNotes: [] },
    [],
    null
  );

  assert.equal(summary.totalActiveNotes, 2);
  assert.equal(summary.lensEligibleNotes, 0);
  assert.equal(summary.isBlankBecauseOfFilters, true);
  assert.equal(summary.shouldShowRecoveryHelper, true);
});
