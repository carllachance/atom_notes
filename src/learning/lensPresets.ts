import { AgeRange, LensPreset, LensPresetId, OnboardingProfile, PrimaryUseCase, StarterLensId } from './studyModel';

export const LENS_PRESETS: Record<LensPresetId, LensPreset> = {
  study_starter: {
    id: 'study_starter',
    label: 'Study starter',
    starterLenses: ['study', 'assignments', 'review_next', 'quiz_me', 'due_soon'],
    activeLensId: 'study'
  },
  work_starter: {
    id: 'work_starter',
    label: 'Work starter',
    starterLenses: ['work', 'projects', 'due_soon', 'review_next', 'focus'],
    activeLensId: 'work'
  },
  mixed_starter: {
    id: 'mixed_starter',
    label: 'Mixed starter',
    starterLenses: ['study', 'work', 'projects', 'review_next', 'personal'],
    activeLensId: 'study'
  }
};

export function getDefaultPresetForUseCase(useCase: PrimaryUseCase): LensPreset {
  if (useCase === 'studying_school') return LENS_PRESETS.study_starter;
  if (useCase === 'work_projects') return LENS_PRESETS.work_starter;
  return LENS_PRESETS.mixed_starter;
}

export function createOnboardingProfile(ageRange: AgeRange, primaryUseCase: PrimaryUseCase, starterLenses?: StarterLensId[]): OnboardingProfile {
  const preset = getDefaultPresetForUseCase(primaryUseCase);
  const resolvedLenses = starterLenses?.length ? starterLenses : preset.starterLenses;
  return {
    ageRange,
    primaryUseCase,
    selectedPresetId: preset.id,
    starterLenses: resolvedLenses,
    activeLensId: resolvedLenses[0] ?? preset.activeLensId,
    configuredAt: Date.now()
  };
}

export const STARTER_LENS_META: Record<StarterLensId, { label: string; description: string }> = {
  study: { label: 'Study', description: 'Learning-focused helpers and practice.' },
  assignments: { label: 'Assignments', description: 'Tasks and coursework in progress.' },
  review_next: { label: 'Review next', description: 'Suggested concepts to revisit.' },
  quiz_me: { label: 'Quiz me', description: 'Prompt-based practice questions.' },
  due_soon: { label: 'Due soon', description: 'Time-sensitive items.' },
  work: { label: 'Work', description: 'Project and delivery context.' },
  projects: { label: 'Projects', description: 'Cross-note project threads.' },
  focus: { label: 'Focus', description: 'Current priority lane.' },
  personal: { label: 'Personal', description: 'General life and personal notes.' }
};

export function setActiveStarterLens(profile: OnboardingProfile, lensId: StarterLensId): OnboardingProfile {
  const starterLenses = profile.starterLenses.includes(lensId) ? profile.starterLenses : [lensId, ...profile.starterLenses];
  return { ...profile, activeLensId: lensId, starterLenses };
}

export const STARTER_LENS_IDS: StarterLensId[] = ['study', 'assignments', 'review_next', 'quiz_me', 'due_soon', 'work', 'projects', 'focus', 'personal'];

export function isStarterLensId(value: unknown): value is StarterLensId {
  return typeof value === 'string' && STARTER_LENS_IDS.includes(value as StarterLensId);
}

export function sanitizeStarterLenses(values: unknown, fallback: StarterLensId[] = LENS_PRESETS.mixed_starter.starterLenses): StarterLensId[] {
  if (!Array.isArray(values)) return fallback;
  const filtered = values.filter((value): value is StarterLensId => isStarterLensId(value));
  return filtered.length ? filtered : fallback;
}

export function resolveStarterLensMeta(lensId: string): { label: string; description: string } {
  return STARTER_LENS_META[lensId as StarterLensId] ?? { label: 'General', description: 'Starter lens' };
}
