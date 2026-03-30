import { useState } from 'react';
import { StudySupportBlock } from '../learning/studyModel';

type StudySupportPanelProps = {
  enabled: boolean;
  blocks: StudySupportBlock[];
  onRunAction: (action: 'explain' | 'key_ideas' | 'quiz' | 'flashcards' | 'review_recommendation' | 'answer_check', userAnswer?: string) => void;
  onRemoveBlock: (blockId: string) => void;
};

const ACTIONS: Array<{ id: StudySupportPanelProps['onRunAction'] extends (action: infer A, ...args: any[]) => any ? A : never; label: string }> = [
  { id: 'explain', label: 'Explain simply' },
  { id: 'key_ideas', label: 'Key ideas' },
  { id: 'quiz', label: 'Quiz me' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'review_recommendation', label: 'Review next' }
];

export function StudySupportPanel({ enabled, blocks, onRunAction, onRemoveBlock }: StudySupportPanelProps) {
  const [answerDraft, setAnswerDraft] = useState('');
  const [revealedCardIds, setRevealedCardIds] = useState<string[]>([]);

  if (!enabled) return null;

  return (
    <section className="study-support-panel" aria-label="Learning Lens">
      <header className="study-support-header">
        <strong>Learning helpers</strong>
        <span>Try first, then check</span>
      </header>

      <div className="study-support-actions">
        {ACTIONS.map((action) => (
          <button key={action.id} type="button" className="ghost-button" onClick={() => onRunAction(action.id)}>{action.label}</button>
        ))}
      </div>

      <div className="study-answer-check">
        <label htmlFor="study-answer-input">Check my answer</label>
        <textarea id="study-answer-input" value={answerDraft} onChange={(event) => setAnswerDraft(event.target.value)} placeholder="Write your answer first, then run check…" />
        <button type="button" className="ghost-button" onClick={() => onRunAction('answer_check', answerDraft)} disabled={!answerDraft.trim()}>
          Check my answer
        </button>
      </div>

      <div className="study-support-blocks">
        {blocks.map((block) => (
          <article key={block.id} className="study-support-block" data-study-type={block.interactionType}>
            <header>
              <div>
                <strong>{block.title}</strong>
                <small>{block.label}</small>
              </div>
              <button type="button" className="ghost-button" onClick={() => onRemoveBlock(block.id)}>Remove</button>
            </header>
            {block.content.kind === 'explanation' ? <p>{block.content.text}</p> : null}
            {block.content.kind === 'key_ideas' ? <ul>{block.content.ideas.map((idea) => <li key={idea}>{idea}</li>)}</ul> : null}
            {block.content.kind === 'quiz_set' ? (
              <ol>
                {block.content.questions.map((question) => (
                  <li key={question.id}>
                    <p>{question.prompt}</p>
                    <details>
                      <summary>Reveal guidance</summary>
                      <p>{question.rationale}</p>
                      <p><strong>Anchor answer:</strong> {question.answer}</p>
                    </details>
                  </li>
                ))}
              </ol>
            ) : null}
            {block.content.kind === 'flashcard_set' ? (
              <ul>
                {block.content.cards.map((card) => {
                  const revealed = revealedCardIds.includes(card.id);
                  return (
                    <li key={card.id}>
                      <p><strong>Prompt:</strong> {card.prompt}</p>
                      {!revealed ? (
                        <button type="button" className="ghost-button" onClick={() => setRevealedCardIds((current) => [...current, card.id])}>Reveal answer</button>
                      ) : (
                        <p><strong>Answer:</strong> {card.answer}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {block.content.kind === 'review_recommendation' ? (
              <>
                <p>{block.content.basis}</p>
                <ul>{block.content.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
              </>
            ) : null}
            {block.content.kind === 'answer_check' ? (
              <>
                <p><strong>Your answer:</strong> {block.content.learnerAnswer}</p>
                <p>{block.content.evaluation}</p>
                <p>{block.content.guidance}</p>
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
