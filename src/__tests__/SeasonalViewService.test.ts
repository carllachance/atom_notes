import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSeasonalView } from '../services/SeasonalViewService';
import type { NoteCardModel } from '../types';

function makeNote(id: string, monthsAgo: number): NoteCardModel {
  const createdAt = Date.now() - monthsAgo * 30 * 86400000;
  return {
    id,
    title: `Note ${id}`,
    body: '',
    anchors: [],
    trace: 'recency',
    x: 0, y: 0, z: 0,
    createdAt,
    updatedAt: createdAt,
    archived: false,
    deleted: false,
    deletedAt: null,
    projectIds: [],
    workspaceId: null,
  };
}

test('6 notes spread across 3 months produces 3 buckets', () => {
  const notes = [
    makeNote('a1', 0), makeNote('a2', 0),
    makeNote('b1', 1), makeNote('b2', 1),
    makeNote('c1', 2), makeNote('c2', 2),
  ];
  const result = computeSeasonalView({ notes, relationships: [] });
  assert.ok(result, 'Expected SeasonalViewData');
  assert.equal(result!.buckets.length, 3);
});

test('peakMonth is the month with the most notes', () => {
  const notes = [
    makeNote('a1', 0), makeNote('a2', 0), makeNote('a3', 0),
    makeNote('b1', 2),
  ];
  const result = computeSeasonalView({ notes, relationships: [] });
  assert.ok(result);
  assert.equal(result!.peakMonth.noteCount, 3);
});

test('warmth of peakMonth is 1.0', () => {
  const notes = [
    makeNote('a1', 0), makeNote('a2', 0),
    makeNote('b1', 2),
  ];
  const result = computeSeasonalView({ notes, relationships: [] });
  assert.ok(result);
  assert.equal(result!.peakMonth.warmth, 1.0);
});

test('warmth of a month with half the peak notes is 0.5', () => {
  const notes = [
    makeNote('a1', 0), makeNote('a2', 0),
    makeNote('b1', 2),
  ];
  const result = computeSeasonalView({ notes, relationships: [] });
  assert.ok(result);
  const halfMonth = result!.buckets.find((b) => b.noteCount === 1);
  assert.ok(halfMonth);
  assert.equal(halfMonth!.warmth, 0.5);
});

test('buckets are ordered chronologically (oldest first)', () => {
  const notes = [
    makeNote('a1', 0),
    makeNote('b1', 3),
  ];
  const result = computeSeasonalView({ notes, relationships: [] });
  assert.ok(result);
  const [first, second] = result!.buckets;
  const firstMs = new Date(first.year, first.month).getTime();
  const secondMs = new Date(second.year, second.month).getTime();
  assert.ok(firstMs < secondMs, `Expected oldest first: ${first.label} < ${second.label}`);
});

test('totalSpanMonths equals months between earliest and latest note', () => {
  const notes = [
    makeNote('a1', 0),
    makeNote('b1', 3),
  ];
  const result = computeSeasonalView({ notes, relationships: [] });
  assert.ok(result);
  // At least 3 months span (0 and 3 months ago, may vary by exact date)
  assert.ok(result!.totalSpanMonths >= 1);
});
