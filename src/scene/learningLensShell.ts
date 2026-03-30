import { OnboardingProfile } from '../learning/studyModel';

export type LearningLensShellMode = 'hidden' | 'onboarding' | 'chips';

export const LEARNING_LENS_SHELL_ENABLED = true;

export function getLearningLensShellMode(onboardingProfile: OnboardingProfile | null | undefined, enabled = LEARNING_LENS_SHELL_ENABLED): LearningLensShellMode {
  if (!enabled) return 'hidden';
  return onboardingProfile ? 'chips' : 'onboarding';
}
