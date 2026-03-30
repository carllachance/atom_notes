import { useMemo, useState } from 'react';
import { createOnboardingProfile, getDefaultPresetForUseCase, LENS_PRESETS, resolveStarterLensMeta } from '../learning/lensPresets';
import { AgeRange, OnboardingProfile, PrimaryUseCase, StarterLensId } from '../learning/studyModel';

const AGE_OPTIONS: Array<{ value: AgeRange; label: string }> = [
  { value: 'child_early_student', label: 'child / early student' },
  { value: 'middle_high_school', label: 'middle school / high school' },
  { value: 'college_adult_learner', label: 'college / adult learner' },
  { value: 'working_adult', label: 'working adult' },
  { value: 'mixed_general_use', label: 'mixed / general use' }
];

const USE_CASE_OPTIONS: Array<{ value: PrimaryUseCase; label: string }> = [
  { value: 'studying_school', label: 'learning / school' },
  { value: 'work_projects', label: 'work / projects' },
  { value: 'personal_organization', label: 'personal organization' },
  { value: 'mixed', label: 'mixed' }
];

export function LearningLensOnboarding({ onComplete }: { onComplete: (profile: OnboardingProfile) => void }) {
  const [ageRange, setAgeRange] = useState<AgeRange>('college_adult_learner');
  const [primaryUseCase, setPrimaryUseCase] = useState<PrimaryUseCase>('studying_school');
  const [customLenses, setCustomLenses] = useState<StarterLensId[] | null>(null);

  const preset = useMemo(() => getDefaultPresetForUseCase(primaryUseCase), [primaryUseCase]);
  const starterLenses = customLenses ?? preset.starterLenses;

  const toggleLens = (lensId: StarterLensId) => {
    setCustomLenses((current) => {
      const base = current ?? preset.starterLenses;
      return base.includes(lensId) ? base.filter((item) => item !== lensId) : [...base, lensId];
    });
  };

  return (
    <div className="learning-onboarding-overlay">
      <section className="learning-onboarding-modal">
        <h2>Set your starter lens bundle</h2>
        <p>This picks an initial setup. Age range is saved now for future tuning; you can change lenses anytime.</p>

        <label>
          Age range
          <select value={ageRange} onChange={(event) => setAgeRange(event.target.value as AgeRange)}>
            {AGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <label>
          Primary use case
          <select value={primaryUseCase} onChange={(event) => { setPrimaryUseCase(event.target.value as PrimaryUseCase); setCustomLenses(null); }}>
            {USE_CASE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        <div className="learning-starter-preview">
          <strong>Chosen starter: {preset.label}</strong>
          <p>Edit now if you want:</p>
          <div className="learning-starter-chips">
            {Object.values(LENS_PRESETS).flatMap((item) => item.starterLenses).filter((item, index, all) => all.indexOf(item) === index).map((lensId) => (
              <button
                key={lensId}
                type="button"
                className={`ghost-button ${starterLenses.includes(lensId) ? 'active' : ''}`}
                title={resolveStarterLensMeta(lensId).description}
                onClick={() => toggleLens(lensId)}
              >
                {resolveStarterLensMeta(lensId).label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="ghost-button primary-action"
          onClick={() => onComplete(createOnboardingProfile(ageRange, primaryUseCase, starterLenses.length ? starterLenses : preset.starterLenses))}
        >
          Continue
        </button>
      </section>
    </div>
  );
}
