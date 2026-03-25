import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeWithPreviousBlock, pasteIntoBlocks, splitBlockOnEnter } from '../notes/semanticEditorOps';
import { SemanticEditableBlock } from '../notes/semanticBlocks';

function baseBlocks(): SemanticEditableBlock[] {
  return [
    { id: 'h1', type: 'heading', level: 1, text: 'Plan' },
    { id: 'p1', type: 'paragraph', text: 'Alpha beta' },
    { id: 'c1', type: 'checklist_item', checked: false, text: 'todo' }
  ];
}

test('split block keeps heading and inserts paragraph continuation', () => {
  const result = splitBlockOnEnter(baseBlocks(), 0, 2);
  assert.equal(result.blocks[0].type, 'heading');
  assert.equal(result.blocks[0].text, 'Pl');
  assert.equal(result.blocks[1].type, 'paragraph');
  assert.equal(result.blocks[1].text, 'an');
  assert.deepEqual(result.focus, { index: 1, caret: 0 });
});

test('split on empty checklist converts row to paragraph', () => {
  const result = splitBlockOnEnter([{ id: 'c', type: 'checklist_item', checked: false, text: '' }], 0, 0);
  assert.deepEqual(result.blocks[0], { id: 'c', type: 'paragraph', text: '' });
});

test('merge at block start merges into previous and preserves caret', () => {
  const result = mergeWithPreviousBlock(baseBlocks(), 2);
  assert.equal(result.blocks.length, 2);
  assert.equal(result.blocks[1].type, 'paragraph');
  assert.equal(result.blocks[1].text, 'Alpha betatodo');
  assert.deepEqual(result.focus, { index: 1, caret: 'Alpha beta'.length });
});

test('merge on empty non-paragraph downgrades to paragraph instead of deleting', () => {
  const result = mergeWithPreviousBlock([{ id: 'h', type: 'heading', level: 1, text: '' }], 0);
  assert.deepEqual(result.blocks, [{ id: 'h', type: 'paragraph', text: '' }]);
});

test('paste multi-line text splits a block and keeps cursor on tail row', () => {
  const result = pasteIntoBlocks(baseBlocks(), 1, 5, 9, 'one\ntwo\nthree');
  assert.equal(result.blocks[1].text, 'Alphaone');
  assert.equal(result.blocks[2].text, 'two');
  assert.equal(result.blocks[3].text, 'threea');
  assert.deepEqual(result.focus, { index: 3, caret: 'three'.length });
});
