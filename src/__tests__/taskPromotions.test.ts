import test from 'node:test';
import assert from 'node:assert/strict';
import { getResolvedTaskFragments, resolveTaskFragment } from '../tasks/taskPromotions';

test('taskPromotions resolves fragments directly when source text is unchanged', () => {
  const resolved = resolveTaskFragment('Alpha beta gamma', {
    id: 'frag-1',
    taskNoteId: 'task-1',
    start: 6,
    end: 10,
    text: 'beta',
    createdAt: 1
  });

  assert.deepEqual(resolved, {
    id: 'frag-1',
    taskNoteId: 'task-1',
    start: 6,
    end: 10,
    text: 'beta',
    createdAt: 1,
    stale: false
  });
});

test('taskPromotions reanchors changed fragments to the nearest matching quote', () => {
  const fragments = getResolvedTaskFragments({
    body: 'Alpha moved beta closer to beta again',
    promotedTaskFragments: [{
      id: 'frag-2',
      taskNoteId: 'task-2',
      start: 20,
      end: 24,
      text: 'beta',
      createdAt: 2
    }]
  });

  assert.equal(fragments[0]?.start, 27);
  assert.equal(fragments[0]?.end, 31);
  assert.equal(fragments[0]?.stale, true);
});
