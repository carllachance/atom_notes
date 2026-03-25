import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBlockSelectionForRange } from '../components/InlineNoteLinkEditor';
import { getBlockPrefix, parseSemanticBlocks } from '../notes/semanticBlocks';

test('source jump resolves semantic preview range back to originating block selection', () => {
  const body = ['Decision: Keep rollout small', 'Follow-up: Schedule QA sign-off', 'Question: What should ship first?'].join('\n');
  const blocks = parseSemanticBlocks(body);
  const blockStarts: number[] = [];
  let cursor = 0;
  blocks.forEach((block, index) => {
    blockStarts[index] = cursor;
    cursor += getBlockPrefix(block).length + block.text.length + 1;
  });

  const start = body.indexOf('Schedule QA sign-off');
  const end = start + 'Schedule QA sign-off'.length;
  const resolved = resolveBlockSelectionForRange(blocks, blockStarts, { start, end });

  assert.ok(resolved);
  assert.equal(resolved?.targetIndex, 1);
  assert.equal(resolved?.localStart, 0);
  assert.equal(resolved?.localEnd, 'Schedule QA sign-off'.length);
});
