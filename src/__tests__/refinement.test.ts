import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInsertedRefinementBlock, generateRefinementSuggestion } from '../ai/refinement';

test('clarify keeps scope local and returns tightened prose', () => {
  const suggestion = generateRefinementSuggestion({
    presetId: 'clarify',
    scope: 'selection',
    sourceText: 'messy thought about launch blockers. need cleaner handoff',
    noteTitle: 'Launch note'
  });

  assert.equal(suggestion.scope, 'selection');
  assert.match(suggestion.summary, /selected text/);
  assert.match(suggestion.suggestedText, /^Messy thought about launch blockers\./);
  assert.match(suggestion.suggestedText, /Need cleaner handoff\./);
});

test('executive summary reshapes output instead of paraphrasing inline', () => {
  const suggestion = generateRefinementSuggestion({
    presetId: 'executive_summary',
    scope: 'note',
    sourceText: 'Revenue slipped in the mid-market segment. Pipeline recovery depends on partner onboarding. Ops needs a cleaner forecast handoff.',
    noteTitle: 'Q2 revenue review'
  });

  assert.match(suggestion.suggestedText, /^# Executive Summary/m);
  assert.match(suggestion.suggestedText, /## Overview/);
  assert.match(suggestion.suggestedText, /## Key Signals/);
  assert.match(suggestion.suggestedText, /## Recommended Next Step/);
});

test('custom restructure preserves instruction in the preview output', () => {
  const suggestion = generateRefinementSuggestion({
    presetId: 'custom',
    scope: 'note',
    sourceText: 'Findings from deposition notes and timeline gaps.',
    noteTitle: 'Deposition prep',
    customInstruction: 'Rewrite this for an executive audience'
  });

  assert.match(suggestion.summary, /executive audience/);
  assert.match(suggestion.suggestedText, /AI-suggested format: Rewrite this for an executive audience/);
});

test('inserted refinement blocks stay clearly labeled as AI-suggested', () => {
  const inserted = buildInsertedRefinementBlock('Executive Summary', '# Executive Summary\n\n## Overview\nClearer draft.');
  assert.match(inserted, /^AI-suggested Executive Summary/);
  assert.match(inserted, /# Executive Summary/);
});
