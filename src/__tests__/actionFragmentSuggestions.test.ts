import test from 'node:test';
import assert from 'node:assert/strict';
import { getLikelyActionFragments } from '../tasks/actionFragmentSuggestions';

test('actionFragmentSuggestions surfaces likely follow-up lines without creating tasks', () => {
  const suggestions = getLikelyActionFragments({
    id: 'note-1',
    intent: 'note',
    body: ['Meeting recap', '- Follow up with finance on revised budget', 'Need to confirm the speaker by Friday', 'Background context only'].join('\n'),
    promotedTaskFragments: []
  });

  assert.deepEqual(
    suggestions.map((item) => item.text),
    ['Follow up with finance on revised budget', 'Need to confirm the speaker by Friday']
  );
  assert.match(suggestions[0]?.reason ?? '', /follow-up|Action-oriented/i);
});

test('actionFragmentSuggestions ignores note fragments that were already promoted', () => {
  const body = ['Planning', '- Review legal language', '- Share the revised copy'].join('\n');
  const reviewStart = body.indexOf('Review legal language');
  const suggestions = getLikelyActionFragments({
    id: 'note-2',
    intent: 'note',
    body,
    promotedTaskFragments: [{ id: 'promotion-1', taskNoteId: 'task-1', start: reviewStart, end: reviewStart + 'Review legal language'.length, text: 'Review legal language', createdAt: 1 }]
  });

  assert.deepEqual(suggestions.map((item) => item.text), ['Share the revised copy']);
});
