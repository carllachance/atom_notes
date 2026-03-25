import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFollowUpLifecycleAction, getLikelyActionFragments } from '../tasks/actionFragmentSuggestions';

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

test('actionFragmentSuggestions prioritizes follow-up semantic blocks for task promotion', () => {
  const body = ['Decision: Keep rollout small', 'Follow-up: Schedule QA sign-off', 'Background context'].join('\n');
  const suggestions = getLikelyActionFragments({
    id: 'note-3',
    intent: 'note',
    body,
    promotedTaskFragments: []
  });

  assert.equal(suggestions[0]?.text, 'Schedule QA sign-off');
  assert.match(suggestions[0]?.reason ?? '', /semantic block|Follow-up/i);
});

test('follow-up lifecycle actions update status and suppress dismissed suggestions', () => {
  const source = ['Decision: Keep rollout small', 'Follow-up: Schedule QA sign-off', 'Background context'].join('\n');
  const suggestion = getLikelyActionFragments({
    id: 'note-4',
    intent: 'note',
    body: source,
    promotedTaskFragments: []
  })[0];
  assert.ok(suggestion);
  const accepted = applyFollowUpLifecycleAction(source, suggestion!, 'accept');
  assert.match(accepted, /Follow-up \(accepted\): Schedule QA sign-off/);

  const dismissed = applyFollowUpLifecycleAction(source, suggestion!, 'dismiss');
  assert.match(dismissed, /Follow-up \(dismissed\): Schedule QA sign-off/);
  const dismissedSuggestions = getLikelyActionFragments({
    id: 'note-4',
    intent: 'note',
    body: dismissed,
    promotedTaskFragments: []
  });
  assert.equal(dismissedSuggestions.length, 0);
});
