import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingProfile, resolveStarterLensMeta, sanitizeStarterLenses, setActiveStarterLens } from '../learning/lensPresets';
import { getLearningLensShellMode } from '../scene/learningLensShell';
import { removeStudyBlockForNote, selectStudyBlocksForNote, upsertStudyBlockForNote } from '../learning/studyState';
import { StudySupportBlock } from '../learning/studyModel';

const blockA: StudySupportBlock = {
  id: 'block-a',
  noteId: 'note-a',
  interactionType: 'key_ideas',
  title: 'Key ideas',
  label: 'AI study support',
  createdAt: 1,
  sourceNoteUpdatedAt: 1,
  generatedFrom: 'note-content',
  content: { kind: 'key_ideas', ideas: ['A1'] }
};

const blockB: StudySupportBlock = {
  ...blockA,
  id: 'block-b',
  noteId: 'note-b',
  content: { kind: 'key_ideas', ideas: ['B1'] }
};

test('learning shell mode renders onboarding only when profile is missing', () => {
  assert.equal(getLearningLensShellMode(null, true), 'onboarding');
  const profile = createOnboardingProfile('working_adult', 'work_projects');
  assert.equal(getLearningLensShellMode(profile, true), 'chips');
  assert.equal(getLearningLensShellMode(profile, false), 'hidden');
});

test('active starter lens switching updates profile deterministically', () => {
  const profile = createOnboardingProfile('college_adult_learner', 'mixed');
  const next = setActiveStarterLens(profile, 'projects');
  assert.equal(next.activeLensId, 'projects');
  assert.equal(next.starterLenses.includes('projects'), true);
});

test('study blocks stay note-scoped and never leak between notes', () => {
  let state: Record<string, StudySupportBlock[]> = {};
  state = upsertStudyBlockForNote(state, 'note-a', blockA);
  state = upsertStudyBlockForNote(state, 'note-b', blockB);

  const noteABlocks = selectStudyBlocksForNote(state, 'note-a');
  const noteBBlocks = selectStudyBlocksForNote(state, 'note-b');

  assert.deepEqual(noteABlocks.map((block) => block.id), ['block-a']);
  assert.deepEqual(noteBBlocks.map((block) => block.id), ['block-b']);
});

test('removing a study block affects only the intended note and block', () => {
  const state = {
    'note-a': [blockA],
    'note-b': [blockB]
  };

  const next = removeStudyBlockForNote(state, 'note-a', 'block-a');
  assert.deepEqual(selectStudyBlocksForNote(next, 'note-a'), []);
  assert.deepEqual(selectStudyBlocksForNote(next, 'note-b').map((block) => block.id), ['block-b']);
});


test('invalid persisted lens ids sanitize safely and fallback metadata never crashes', () => {
  const sanitized = sanitizeStarterLenses(['bad-id', 'study', 42]);
  assert.deepEqual(sanitized, ['study']);
  const fallbackMeta = resolveStarterLensMeta('unknown-lens');
  assert.equal(fallbackMeta.label, 'General');
});

test('re-running the same interaction type replaces prior block for that note', () => {
  let state: Record<string, StudySupportBlock[]> = {};
  state = upsertStudyBlockForNote(state, 'note-a', blockA);
  const replacement: StudySupportBlock = { ...blockA, id: 'block-a-2', createdAt: 2 };
  state = upsertStudyBlockForNote(state, 'note-a', replacement);
  assert.deepEqual(selectStudyBlocksForNote(state, 'note-a').map((block) => block.id), ['block-a-2']);
});
