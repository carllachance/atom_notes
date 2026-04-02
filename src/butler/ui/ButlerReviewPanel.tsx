import { ButlerItem, MemoryPreference } from '../../types';

type ButlerReviewPanelProps = {
  item: ButlerItem;
  memoryPreferences: MemoryPreference[];
  onOpenSourceNote?: (noteId: string) => void;
  onSubmitClarification?: (itemId: string, answers: Record<string, string>) => void | Promise<void>;
};

export function ButlerReviewPanel({ item, memoryPreferences, onOpenSourceNote, onSubmitClarification }: ButlerReviewPanelProps) {
  const linkedMemory = memoryPreferences.filter((memory) => item.memoryLinks.includes(memory.id));
  const hasClarificationQuestions = item.clarificationQuestions.length > 0;
  const sectionTitle = hasClarificationQuestions ? 'Clarification' : 'Reusable signals';
  const sectionCount = hasClarificationQuestions ? item.clarificationQuestions.length : item.reuseSignals.length + linkedMemory.length;
  return (
    <section className="butler-detail__section">
      <div className="butler-detail__section-head">
        <strong>{sectionTitle}</strong>
        <span>{sectionCount}</span>
      </div>
      {hasClarificationQuestions ? (
        <form
          className="butler-bullet-block butler-clarify-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!onSubmitClarification) return;
            const formData = new FormData(event.currentTarget);
            const answers = item.clarificationQuestions.reduce<Record<string, string>>((acc, question) => {
              acc[question.id] = String(formData.get(question.id) ?? '').trim();
              return acc;
            }, {});
            onSubmitClarification(item.id, answers);
          }}
        >
          <strong>Clarify before planning</strong>
          {item.clarificationQuestions.map((question) => (
            <label key={question.id} className="butler-clarify-form__question">
              <span>{question.prompt}</span>
              {question.detail ? <small>{question.detail}</small> : null}
              {question.options?.length ? (
                <select name={question.id} defaultValue={question.answer ?? ''}>
                  <option value="">Select one</option>
                  {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input
                  name={question.id}
                  type={/access-token/.test(question.id) ? 'password' : 'text'}
                  defaultValue={question.answer ?? ''}
                  placeholder={question.placeholder ?? 'Add the missing scope'}
                />
              )}
            </label>
          ))}
          <button type="submit">Continue with clarification</button>
        </form>
      ) : null}
      {linkedMemory.length ? (
        <div className="butler-bullet-block">
          <strong>Memory</strong>
          {linkedMemory.map((memory) => <p key={memory.id}>{memory.value}</p>)}
        </div>
      ) : null}
      {item.reuseSignals.length ? (
        <div className="butler-bullet-block">
          <strong>Promotion hints</strong>
          {item.reuseSignals.map((signal) => <p key={signal}>{signal}</p>)}
        </div>
      ) : null}
      {item.sourceContext.length ? (
        <div className="butler-bullet-block">
          <strong>Source context</strong>
          {item.sourceContext.map((context) => (
            <div key={`${context.kind}-${context.label}`} className="butler-source-row">
              <p>{context.label}</p>
              {onOpenSourceNote && context.sourceIds.length ? (
                <div className="butler-source-row__actions">
                  {context.sourceIds.slice(0, 2).map((sourceId) => (
                    <button key={sourceId} type="button" onClick={() => onOpenSourceNote(sourceId)}>Open source</button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
