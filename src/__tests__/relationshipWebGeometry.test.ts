import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRelationshipEdgePath,
  getNoteCenter,
  getRelatedNodeStyle,
  getRelationshipWebPlaneStyle
} from '../components/relationshipWebGeometry';

function extractPathNumbers(path: string) {
  return path
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number) ?? [];
}

const active = {
  x: 120,
  y: 160,
  trace: 'idle',
  updatedAt: 2_000,
  archived: false,
  deleted: false,
  deletedAt: null
} as const;

const target = {
  x: 860,
  y: 420,
  trace: 'captured',
  updatedAt: 2_000,
  archived: false,
  deleted: false,
  deletedAt: null
} as const;

test('builds edge paths directly from note centers in canvas coordinates', (t: any) => {
  t.mock.method(Date, 'now', () => 2_000);

  const numbers = extractPathNumbers(buildRelationshipEdgePath(active, target));
  const activeCenter = getNoteCenter(active);
  const targetCenter = getNoteCenter(target);

  assert.equal(numbers[0], activeCenter.x);
  assert.equal(numbers[1], activeCenter.y);
  assert.equal(numbers[6], targetCenter.x);
  assert.equal(numbers[7], targetCenter.y);
});

test('keeps the relationship plane locked to the canvas viewport across arbitrary viewport sizes', () => {
  assert.deepEqual(
    getRelationshipWebPlaneStyle({
      left: 24,
      top: 80,
      scrollLeft: 310,
      scrollTop: 140
    }),
    {
      transform: 'translate(-286px, -60px)'
    }
  );

  assert.deepEqual(
    getRelationshipWebPlaneStyle({
      left: 142,
      top: 12,
      scrollLeft: 0,
      scrollTop: 420
    }),
    {
      transform: 'translate(142px, -408px)'
    }
  );
});

test('positions related-node affordances in the same raw canvas coordinate space as notes', (t: any) => {
  t.mock.method(Date, 'now', () => 2_000);
  assert.deepEqual(getRelatedNodeStyle(target), {
    transform: 'translate(955.475px, 461.82000000000005px)'
  });
});
