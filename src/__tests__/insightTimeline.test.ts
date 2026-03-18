import test from 'node:test';
import assert from 'node:assert/strict';
import { appendInsightTimelineEntries, createAIInsightTimelineEntry, getInsightTimelineForNote } from '../insights/insightTimeline';
import type { InsightsResponse, SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: 'Alpha', body: 'alpha body', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 1, updatedAt: 1, archived: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] },
      { id: 'b', title: 'Beta', body: 'beta body', anchors: [], trace: 'idle', x: 1, y: 1, z: 2, createdAt: 1, updatedAt: 1, archived: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] }
    ],
    relationships: [],
    projects: [],
    workspaces: [],
    insightTimeline: [],
    isDragging: false,
    activeNoteId: 'a',
    quickCaptureOpen: false,
    captureComposer: { open: false, draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { state: 'open', mode: 'ask', query: '', response: null, transcript: [], loading: false },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

const response: InsightsResponse = {
  answer: 'The local graph points toward Beta as the next useful source.',
  sections: [{ id: 'summary', title: 'Grounded view', body: '1. direct match' }],
  references: ['b'],
  results: [{ noteId: 'b', score: 8, reasons: ['direct match'] }],
  actions: [{ id: 'append', label: 'Add to current note', kind: 'append_to_note', requiresConfirmation: true }],
  highlightNoteIds: ['b']
};

test('insight timeline groups recent entries into Now and limits Earlier visibility', () => {
  const grouped = getInsightTimelineForNote([
    { id: '1', noteId: 'a', kind: 'ai', title: 'Newest', detail: 'fresh', createdAt: 1000, actions: [] },
    { id: '2', noteId: 'a', kind: 'action', title: 'Second', detail: 'fresh', createdAt: 900, actions: [] },
    { id: '3', noteId: 'a', kind: 'structural', title: 'Third', detail: 'fresh', createdAt: 800, actions: [] },
    { id: '4', noteId: 'a', kind: 'structural', title: 'Older 1', detail: 'older', createdAt: 700, actions: [] },
    { id: '5', noteId: 'a', kind: 'structural', title: 'Older 2', detail: 'older', createdAt: 600, actions: [] },
    { id: '6', noteId: 'a', kind: 'structural', title: 'Older 3', detail: 'older', createdAt: 500, actions: [] },
    { id: '7', noteId: 'a', kind: 'structural', title: 'Older 4', detail: 'older', createdAt: 400, actions: [] },
    { id: '8', noteId: 'a', kind: 'structural', title: 'Older 5', detail: 'older', createdAt: 300, actions: [] }
  ], 'a', 1000 + 1000 * 60 * 60 * 24);

  assert.deepEqual(grouped.nowEntries.map((entry) => entry.id), ['1', '2', '3']);
  assert.deepEqual(grouped.visibleEarlierEntries.map((entry) => entry.id), ['4', '5', '6', '7']);
  assert.deepEqual(grouped.hiddenEarlierEntries.map((entry) => entry.id), ['8']);
});

test('insight timeline stores high-value AI outputs with open, link, and apply actions', (t: any) => {
  t.mock.method(Date, 'now', () => 42_000);
  const entry = createAIInsightTimelineEntry(makeScene(), 'a', response, 'ask', 'what matters now?', 42_000);
  assert.ok(entry);
  assert.equal(entry?.title, 'Insight surfaced Beta');
  assert.deepEqual(entry?.actions.map((action) => action.label), ['Open', 'Link', 'Apply']);

  const scene = appendInsightTimelineEntries(makeScene(), [entry!]);
  const deduped = appendInsightTimelineEntries(scene, [entry!]);
  assert.equal(deduped.insightTimeline?.length, 1);
});
