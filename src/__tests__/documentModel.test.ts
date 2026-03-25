import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoteBodyFromLegacyText, documentToLegacyText, legacyTextToDocument, noteBodyToDocument } from '../notes/documentModel';

test('documentModel converts markdown-ish text into semantic blocks', () => {
  const document = legacyTextToDocument(`# Sprint notes\n\n- [ ] call Robin\n- done item\n1. First\n2. Second\n\n> keep this in view`);

  assert.equal(document.version, 1);
  assert.deepEqual(document.blocks, [
    { id: 'heading-1', type: 'heading', level: 1, text: 'Sprint notes' },
    { id: 'check-11', type: 'checklist_item', text: 'call Robin', checked: false },
    { id: 'bullet-12', type: 'bulleted_item', text: 'done item' },
    { id: 'number-21', type: 'numbered_item', text: 'First', order: 1 },
    { id: 'number-22', type: 'numbered_item', text: 'Second', order: 2 },
    { id: 'quote-4', type: 'quote', text: 'keep this in view' }
  ]);
});

test('documentModel projects semantic blocks back into text', () => {
  const document = legacyTextToDocument('## Plan\n\n- [x] shipped\n- [ ] test\n\n```ts\nconst done = true;\n```');
  const text = documentToLegacyText(document);

  assert.match(text, /## Plan/);
  assert.match(text, /- \[x\] shipped/);
  assert.match(text, /- \[ \] test/);
  assert.match(text, /```ts/);
  assert.match(text, /const done = true;/);
});

test('documentModel supports NoteBody compatibility wrapper', () => {
  const noteBody = createNoteBodyFromLegacyText('Simple paragraph');
  const doc = noteBodyToDocument(noteBody);

  assert.equal(noteBody.kind, 'document');
  assert.equal(doc.blocks[0]?.type, 'paragraph');
  assert.equal((doc.blocks[0] as { text?: string }).text, 'Simple paragraph');
});

test('documentModel promotes semantic rows into first-class atom blocks', () => {
  const document = legacyTextToDocument('Decision: Ship the modal first\nQuestion: Which links are active?\nFollow-up: Verify ranking thresholds');

  assert.equal(document.blocks[0]?.type, 'decision');
  assert.equal(document.blocks[1]?.type, 'open_question');
  assert.equal(document.blocks[2]?.type, 'follow_up');
  assert.match(documentToLegacyText(document), /Follow-up/);
});
