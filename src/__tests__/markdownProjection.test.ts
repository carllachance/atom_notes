import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownProjection, toggleMarkdownCheckbox } from '../markdownProjection';

test('parseMarkdownProjection detects plain and bulleted checkbox patterns', () => {
  const blocks = parseMarkdownProjection(['[ ] inbox zero', '- [x] shipped', 'plain paragraph'].join('\n'));

  assert.equal(blocks[0].type, 'unordered_list');
  if (blocks[0].type !== 'unordered_list') return;
  assert.equal(blocks[0].items.length, 1);
  assert.equal(blocks[0].items[0].checked, false);
  assert.equal(blocks[0].items[0].lineIndex, 0);
  assert.equal(blocks[1].type, 'unordered_list');
  if (blocks[1].type !== 'unordered_list') return;
  assert.equal(blocks[1].items[0].checked, true);
  assert.equal(blocks[1].items[0].lineIndex, 1);
  assert.equal(blocks[2].type, 'paragraph');
});

test('toggleMarkdownCheckbox preserves line syntax while updating state', () => {
  const source = ['[ ] inbox zero', '- [x] shipped', '1. [ ] review'].join('\n');

  const toggledPlain = toggleMarkdownCheckbox(source, 0, true);
  const toggledBulleted = toggleMarkdownCheckbox(toggledPlain, 1, false);
  const toggledOrdered = toggleMarkdownCheckbox(toggledBulleted, 2, true);

  assert.equal(toggledOrdered, ['[x] inbox zero', '- [ ] shipped', '1. [x] review'].join('\n'));
});
