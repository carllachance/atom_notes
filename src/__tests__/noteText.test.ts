import { describe, expect, it } from 'vitest';
import { getCompactDisplayTitle, getDisplayTitle, getSummaryPreview, normalizeOptionalTitle } from '../noteText';

describe('noteText contract helpers', () => {
  it('normalizes optional title and derives display title from body', () => {
    expect(normalizeOptionalTitle('   Hello   there ')).toBe('Hello there');
    expect(normalizeOptionalTitle('   ')).toBeNull();

    expect(getDisplayTitle({ title: ' Explicit ', body: 'Body line' })).toBe('Explicit');
    expect(getDisplayTitle({ title: null, body: '\n\nFirst meaningful line\nSecond line' })).toBe('First meaningful line');
    expect(getDisplayTitle({ title: null, body: '   ' })).toBe('Quick note');
  });

  it('provides compact title and summary preview consistently', () => {
    expect(getCompactDisplayTitle({ title: null, body: 'This is long body title seed' }, 8)).toBe('This is…');
    expect(getSummaryPreview({ body: '   alpha    beta    gamma   ' }, 10)).toBe('alpha bet…');
    expect(getSummaryPreview({ body: '   ' })).toBe('No summary yet.');
  });
});
