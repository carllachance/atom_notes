import test from 'node:test';
import assert from 'node:assert/strict';
import { getRelationshipsForActiveFilter, getRelationshipSummaryItems, INSIGHTS_RAIL_MODES } from '../detailSurface/detailSurfaceModel';

test('detailSurfaceModel returns summary-first relationship cards only for populated types', () => {
  const summaries = getRelationshipSummaryItems({
    related: 2,
    references: 0,
    depends_on: 1,
    supports: 0,
    contradicts: 0,
    part_of: 0,
    leads_to: 0,
    derived_from: 3
  });

  assert.deepEqual(
    summaries.map((summary) => ({ type: summary.type, count: summary.count })),
    [
      { type: 'related', count: 2 },
      { type: 'depends_on', count: 1 },
      { type: 'derived_from', count: 3 }
    ]
  );
});

test('detailSurfaceModel only expands linked notes when a relationship slice is selected', () => {
  const relationships = [
    { id: 'r1', type: 'related' as const, targetTitle: 'One' },
    { id: 'r2', type: 'references' as const, targetTitle: 'Two' },
    { id: 'r3', type: 'related' as const, targetTitle: 'Three' }
  ];

  assert.deepEqual(getRelationshipsForActiveFilter(relationships, 'all'), []);
  assert.deepEqual(
    getRelationshipsForActiveFilter(relationships, 'related').map((relationship) => relationship.id),
    ['r1', 'r3']
  );
});

test('detailSurfaceModel keeps all four insights modes available in the rail', () => {
  assert.deepEqual(
    INSIGHTS_RAIL_MODES.map((mode) => mode.mode),
    ['ask', 'explore', 'summarize', 'act']
  );
});
