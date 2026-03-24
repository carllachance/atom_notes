import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemorySummary } from '../store/memorySummary';
import { NoteCardModel } from '../types';
import { HistoryStackEntry, StateSnapshot } from '../types/reeentory';

function makeNote(id: string, title: string): NoteCardModel {
  return {
    id,
    title,
    body: `${title} body`,
    anchors: [],
    trace: 'idle',
    x: 0,
    y: 0,
    z: 1,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    deleted: false,
    deletedAt: null,
    projectIds: [],
    workspaceId: null,
    verificationState: 'verified'
  };
}

test('buildMemorySummary returns null when no context exists', () => {
  const result = buildMemorySummary([], [], [], null);
  assert.equal(result.summary, null);
  assert.equal(result.source, null);
});

test('buildMemorySummary composes concise deterministic summary', () => {
  const notes = [makeNote('a', 'Alpha'), makeNote('b', 'Beta')];
  const history: HistoryStackEntry[] = [
    { id: 'h1', timestamp: 10, noteId: 'a', noteTitle: 'Alpha', lensKind: 'universe', focusMode: { highlight: true, isolate: false }, isPinned: false },
    { id: 'h2', timestamp: 9, noteId: 'b', noteTitle: 'Beta', lensKind: 'universe', focusMode: { highlight: true, isolate: false }, isPinned: false }
  ];
  const bookmarks: StateSnapshot[] = [
    {
      id: 'p1',
      label: 'Morning loop',
      createdAt: 10,
      activeNoteId: 'a',
      lens: { kind: 'universe' },
      focusMode: { highlight: true, isolate: false },
      recentNoteIds: ['a', 'b'],
      memorySummary: null,
      summarySource: null
    }
  ];

  const result = buildMemorySummary(history, bookmarks, notes, 'a');
  assert.match(result.summary ?? '', /You are in Alpha/);
  assert.match(result.summary ?? '', /Recent path: Alpha → Beta/);
  assert.match(result.summary ?? '', /Latest pin: Morning loop/);
  assert.equal(result.source, 'ai-inferred');
});
