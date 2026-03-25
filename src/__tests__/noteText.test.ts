import test from 'node:test';
import assert from 'node:assert/strict';
import { getCompactDisplayTitle, getDisplayTitle, getRecapPreview, getSummaryPreview, getUnresolvedPreview, normalizeOptionalTitle } from '../noteText';

test('normalizes optional title and derives display title from body', () => {
  assert.equal(normalizeOptionalTitle('   Hello   there '), 'Hello there');
  assert.equal(normalizeOptionalTitle('   '), null);

  assert.equal(getDisplayTitle({ title: ' Explicit ', body: 'Body line' }), 'Explicit');
  assert.equal(getDisplayTitle({ title: null, body: '\n\nFirst meaningful line\nSecond line' }), 'First meaningful line');
  assert.equal(getDisplayTitle({ title: null, body: '   ' }), 'Quick note');
});

test('provides compact title and summary preview consistently', () => {
  assert.equal(getCompactDisplayTitle({ title: null, body: 'This is long body title seed' }, 8), 'This is…');
  assert.equal(getSummaryPreview({ title: null, body: '   alpha    beta    gamma   ' }, 10), 'alpha bet…');
  assert.equal(getSummaryPreview({ title: null, body: 'Heading\nDeeper context line\nSecond detail' }, 24), 'Deeper context line Sec…');
  assert.equal(getSummaryPreview({ title: 'Explicit', body: 'Heading\nDeeper context line' }, 24), 'Heading Deeper context…');
  assert.equal(getSummaryPreview({ title: null, body: '   ' }), 'No summary yet.');
});

test('surfaces semantic recap and unresolved previews without mutating body text', () => {
  const note = {
    title: null,
    body: [
      'Intro context',
      'Decision: Keep the modal dominant',
      'Question: Do we need a history toggle?',
      'Follow-up: Add ranking test coverage'
    ].join('\n')
  };

  assert.equal(getRecapPreview(note), 'Keep the modal dominant');
  assert.equal(getUnresolvedPreview(note), 'Do we need a history toggle?');
  assert.match(note.body, /Follow-up: Add ranking test coverage/);
});
