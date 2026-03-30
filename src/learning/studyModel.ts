import { Lens, NoteCardModel } from '../types';

export type AgeRange =
  | 'child_early_student'
  | 'middle_high_school'
  | 'college_adult_learner'
  | 'working_adult'
  | 'mixed_general_use';

export type PrimaryUseCase = 'studying_school' | 'work_projects' | 'personal_organization' | 'mixed';

export type StarterLensId = 'study' | 'assignments' | 'review_next' | 'quiz_me' | 'due_soon' | 'work' | 'projects' | 'focus' | 'personal';
export type LensPresetId = 'study_starter' | 'work_starter' | 'mixed_starter';

export type LensPreset = {
  id: LensPresetId;
  label: string;
  starterLenses: StarterLensId[];
  activeLensId: StarterLensId;
};

export type OnboardingProfile = {
  ageRange: AgeRange;
  primaryUseCase: PrimaryUseCase;
  selectedPresetId: LensPresetId;
  starterLenses: StarterLensId[];
  activeLensId: StarterLensId;
  configuredAt: number;
};

export type StudyInteractionType = 'explain' | 'key_ideas' | 'quiz' | 'flashcards' | 'answer_check' | 'review_recommendation';

export type StudyBlockContent =
  | { kind: 'explanation'; text: string }
  | { kind: 'key_ideas'; ideas: string[] }
  | { kind: 'quiz_set'; questions: Array<{ id: string; prompt: string; choices: string[]; answer: string; rationale: string }> }
  | { kind: 'flashcard_set'; cards: Array<{ id: string; prompt: string; answer: string }> }
  | { kind: 'answer_check'; prompt: string; learnerAnswer: string; evaluation: string; guidance: string; confidence: 'low' | 'medium' | 'high' }
  | { kind: 'review_recommendation'; recommendations: string[]; basis: string };

export type StudySupportBlock = {
  id: string;
  noteId: string;
  interactionType: StudyInteractionType;
  title: string;
  label: 'AI study support';
  createdAt: number;
  sourceNoteUpdatedAt: number;
  generatedFrom: 'note-content';
  content: StudyBlockContent;
};

export type StudyInteraction = {
  id: string;
  noteId: string;
  interactionType: StudyInteractionType;
  createdAt: number;
  prompt?: string;
  userResponse?: string;
  aiFeedback?: string;
  weakSignals?: string[];
};

export type StudySupportState = {
  blocksByNoteId: Record<string, StudySupportBlock[]>;
  interactionsByNoteId: Record<string, StudyInteraction[]>;
};

export function createEmptyStudySupportState(): StudySupportState {
  return { blocksByNoteId: {}, interactionsByNoteId: {} };
}

export function shouldOfferStudyActions(note: NoteCardModel | null, lens: Lens, onboardingProfile: OnboardingProfile | null): boolean {
  if (!note || note.archived || note.deleted) return false;
  const hasBody = note.body.trim().length >= 80;
  if (!hasBody) return false;
  const studyLensActive = onboardingProfile?.activeLensId === 'study';
  const revealStudyHint = lens.kind === 'reveal' && /\b(study|learn|quiz|review|flashcard|assignment|exam|homework)\b/i.test(lens.query);
  const explicitStudyMarker = /\B#study\b|\[study\]/i.test(note.body) || /\B#study\b|\[study\]/i.test(note.title ?? '');
  return Boolean(studyLensActive || revealStudyHint || explicitStudyMarker);
}
