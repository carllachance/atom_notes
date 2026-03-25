import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSemanticBlocks, serializeSemanticBlocks } from '../notes/semanticBlocks';

test('semantic blocks parse headings, checklist rows, and paragraphs', () => {
  const blocks = parseSemanticBlocks('# Plan\n- [x] done\nPlain');
  assert.deepEqual(blocks[0], { ...blocks[0], type: 'heading', level: 1, text: 'Plan' });
  assert.deepEqual(blocks[1], { ...blocks[1], type: 'checklist_item', checked: true, text: 'done' });
  assert.deepEqual(blocks[2], { ...blocks[2], type: 'paragraph', text: 'Plain' });
});

test('semantic blocks round-trip supported syntax', () => {
  const source = '## Heading\n- [ ] todo\nParagraph';
  const blocks = parseSemanticBlocks(source);
  assert.equal(serializeSemanticBlocks(blocks), source);
});
