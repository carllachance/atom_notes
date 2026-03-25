import test from 'node:test';
import assert from 'node:assert/strict';
import { convertBlockType, normalizeSemanticBlock, parseSemanticBlocks, serializeSemanticBlocks } from '../notes/semanticBlocks';

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

test('semantic blocks safely normalize unsupported block types', () => {
  const normalized = normalizeSemanticBlock({ id: 'u1', type: 'quote', text: '> sourced text' });
  assert.equal(normalized.type, 'unsupported');
  if (normalized.type !== 'unsupported') throw new Error('Expected unsupported semantic block');
  assert.equal(normalized.originalType, 'quote');
  assert.equal(normalized.text, '> sourced text');
});

test('semantic blocks preserve unsupported rows during serialization', () => {
  const output = serializeSemanticBlocks([
    { id: 'a', type: 'paragraph', text: 'plain' },
    { id: 'u', type: 'unsupported', text: '> quoted', raw: '> quoted', originalType: 'quote' },
    { id: 'b', type: 'checklist_item', checked: false, text: 'todo' }
  ]);
  assert.equal(output, 'plain\n> quoted\n- [ ] todo');
});

test('semantic blocks support lightweight block-type conversion', () => {
  const heading = convertBlockType({ id: 'a', type: 'paragraph', text: 'Title' }, 'heading');
  const checklist = convertBlockType(heading, 'checklist_item');
  assert.deepEqual(heading, { id: 'a', type: 'heading', level: 1, text: 'Title' });
  assert.deepEqual(checklist, { id: 'a', type: 'checklist_item', checked: false, text: 'Title' });
});

test('semantic blocks keep mixed-content note text non-destructive', () => {
  const source = 'Paragraph\n> external quote\n1. ordered item\n- bullet';
  const blocks = parseSemanticBlocks(source);
  assert.equal(serializeSemanticBlocks(blocks), source);
});
