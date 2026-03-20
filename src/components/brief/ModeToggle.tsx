import './ModeToggle.css';

interface ModeToggleProps {
  mode: 'reading' | 'landscape';
  onChange: (mode: 'reading' | 'landscape') => void;
}

function ReadingIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor" />
      <rect x="0" y="5" width="11" height="2" rx="1" fill="currentColor" />
      <rect x="0" y="10" width="8" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

function LandscapeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2" fill="currentColor" />
      <path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M7 12.5 A5.5 5.5 0 0 1 1.5 7" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle" role="group" aria-label="View mode">
      <button
        className={`mode-toggle__btn${mode === 'reading' ? ' mode-toggle__btn--active' : ''}`}
        onClick={() => onChange('reading')}
        title="Reading mode"
        aria-pressed={mode === 'reading'}
      >
        <ReadingIcon />
      </button>
      <button
        className={`mode-toggle__btn${mode === 'landscape' ? ' mode-toggle__btn--active' : ''}`}
        onClick={() => onChange('landscape')}
        title="Landscape mode"
        aria-pressed={mode === 'landscape'}
      >
        <LandscapeIcon />
      </button>
    </div>
  );
}
