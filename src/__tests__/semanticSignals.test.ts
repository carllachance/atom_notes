import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSemanticSignals } from '../notes/semanticSignals';

test('semanticSignals extracts decisions, open questions, and follow-ups with ranges', () => {
  const source = [
    'Context line',
    'Decision: Keep reveal subtle',
    'Question: Which edges stay visible?',
    'Follow-up: Add unresolved strip'
  ].join('\n');

  const signals = collectSemanticSignals(source);
  assert.deepEqual(signals.map((signal) => signal.type), ['decision', 'open_question', 'follow_up']);
  assert.equal(signals[0]?.text, 'Keep reveal subtle');
  assert.equal(signals[1]?.text, 'Which edges stay visible?');
  assert.equal(signals[2]?.text, 'Add unresolved strip');
  assert.ok((signals[2]?.start ?? -1) > (signals[1]?.start ?? -1));
});
