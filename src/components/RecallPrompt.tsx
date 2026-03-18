type RecallPromptProps = {
  noteTitle: string;
  suggestedNextStep: string;
  onAdvance: () => void;
  onClear: () => void;
};

export function RecallPrompt({ noteTitle, suggestedNextStep, onAdvance, onClear }: RecallPromptProps) {
  return (
    <section className="recall-prompt" aria-live="polite">
      <div className="recall-prompt-copy">
        <span className="recall-prompt-label">Where was I?</span>
        <div className="recall-prompt-details">
          <p><strong>Last active note</strong>{noteTitle}</p>
          <p><strong>Suggested next step</strong>{suggestedNextStep}</p>
        </div>
      </div>

      <div className="recall-prompt-actions">
        <button type="button" onClick={onAdvance}>Resume note</button>
        <button type="button" className="ghost-button" onClick={onClear}>Clear</button>
      </div>
    </section>
  );
}
