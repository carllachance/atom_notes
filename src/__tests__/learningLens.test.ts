import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnboardingProfile, getDefaultPresetForUseCase, LENS_PRESETS } from '../learning/lensPresets';
import { shouldOfferStudyActions } from '../learning/studyModel';
import { generateStudyBlock } from '../learning/studySupportService';
import { NoteCardModel } from '../types';

const sampleNote: NoteCardModel = {
  id: 'study-1',
  title: 'Cell Respiration',
  body: 'Cell respiration converts glucose into ATP through glycolysis, the Krebs cycle, and oxidative phosphorylation. Oxygen acts as the final electron acceptor in aerobic respiration. The process releases energy that cells use for work.',
  anchors: [],
  trace: 'refined',
  x: 0,
  y: 0,
  z: 1,
  createdAt: 1,
  updatedAt: 2,
  archived: false,
  deleted: false,
  deletedAt: null,
  projectIds: [],
  workspaceId: null
};

test('study onboarding defaults to study starter for studying use case', () => {
  const preset = getDefaultPresetForUseCase('studying_school');
  assert.equal(preset.id, 'study_starter');
  assert.deepEqual(preset.starterLenses, LENS_PRESETS.study_starter.starterLenses);

  const profile = createOnboardingProfile('college_adult_learner', 'studying_school');
  assert.equal(profile.activeLensId, 'study');
  assert.equal(profile.selectedPresetId, 'study_starter');
});

test('study support generation keeps retrieval-first quiz and answer check blocks separate', () => {
  const quiz = generateStudyBlock(sampleNote, 'quiz');
  assert.ok(quiz);
  assert.equal(quiz?.content.kind, 'quiz_set');
  assert.equal((quiz?.content.kind === 'quiz_set' ? quiz.content.questions.length : 0) > 0, true);

  const check = generateStudyBlock(sampleNote, 'answer_check', [], 'ATP is made in mitochondria after glucose breakdown.');
  assert.ok(check);
  assert.equal(check?.content.kind, 'answer_check');
  if (check?.content.kind === 'answer_check') {
    assert.match(check.content.evaluation, /Good start|off-track/);
    assert.equal(check.content.learnerAnswer.includes('glucose'), true);
  }
});


test('answer_check requires user input before generating a block', () => {
  const withoutAnswer = generateStudyBlock(sampleNote, 'answer_check');
  assert.equal(withoutAnswer, null);
});

test('study helpers stay hidden for generic notes unless eligibility signals are present', () => {
  const genericNote: NoteCardModel = { ...sampleNote, body: 'General planning note with no explicit marker and no study framing in query. This sentence keeps the note long enough for eligibility checks while staying non-study by default.' };
  const hidden = shouldOfferStudyActions(genericNote, { kind: 'universe' }, {
    ageRange: 'working_adult',
    primaryUseCase: 'work_projects',
    selectedPresetId: 'work_starter',
    starterLenses: ['work'],
    activeLensId: 'work',
    configuredAt: 1
  });
  assert.equal(hidden, false);

  const shownByReveal = shouldOfferStudyActions(genericNote, { kind: 'reveal', query: 'quiz prep', workspaceId: null, projectId: null, mode: 'context' }, null);
  assert.equal(shownByReveal, true);
});
