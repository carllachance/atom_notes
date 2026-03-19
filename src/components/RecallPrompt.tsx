type RecallPromptProps = {
  noteTitle: string;
  suggestedNextStep: string;
  onAdvance: () => void;
  onClear: () => void;
};

export function RecallPrompt({ noteTitle, suggestedNextStep, onAdvance, onClear }: RecallPromptProps) {
  return (
    <div className="recall-resume" aria-live="polite">
      <button
        type="button"
        className="recall-resume-chip"
        onClick={onAdvance}
        title={suggestedNextStep}
        aria-label={`Continue ${noteTitle}. ${suggestedNextStep}`}
      >
        <span className="recall-resume-chip__label">Where was I</span>
        <span className="recall-resume-chip__title">{noteTitle}</span>
      </button>
      <button
        type="button"
        className="recall-resume-dismiss"
        onClick={onClear}
        aria-label="Dismiss resume suggestion"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
