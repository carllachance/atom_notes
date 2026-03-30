import { now } from '../notes/noteModel';
import { NoteCardModel } from '../types';
import { StudyInteraction, StudyInteractionType, StudySupportBlock } from './studyModel';

function splitSentences(body: string) {
  return body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

function firstMeaningfulWords(body: string, max = 6) {
  return body
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, max);
}

function deterministicShuffle<T>(items: T[], seedSource: string) {
  let seed = 0;
  for (const char of seedSource) seed = (seed * 31 + char.charCodeAt(0)) % 2147483647;
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    seed = (seed * 48271) % 2147483647;
    const j = seed % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function generateStudyBlock(note: NoteCardModel, interactionType: StudyInteractionType, interactions: StudyInteraction[] = [], userAnswer?: string): StudySupportBlock | null {
  const sentences = splitSentences(note.body);
  if (sentences.length === 0) return null;

  const createdAt = now();
  const id = `${interactionType}-${createdAt}-${crypto.randomUUID().slice(0, 8)}`;

  if (interactionType === 'explain') {
    const text = `AI help: ${sentences.slice(0, 2).join(' ')} Focus first on describing this in your own words, then compare.`;
    return {
      id,
      noteId: note.id,
      interactionType,
      title: 'Explain simply',
      label: 'AI study support',
      createdAt,
      sourceNoteUpdatedAt: note.updatedAt,
      generatedFrom: 'note-content',
      content: { kind: 'explanation', text }
    };
  }

  if (interactionType === 'key_ideas') {
    return {
      id,
      noteId: note.id,
      interactionType,
      title: 'Key ideas',
      label: 'AI study support',
      createdAt,
      sourceNoteUpdatedAt: note.updatedAt,
      generatedFrom: 'note-content',
      content: { kind: 'key_ideas', ideas: sentences.slice(0, 5).map((sentence) => sentence.replace(/\s+/g, ' ')) }
    };
  }

  if (interactionType === 'quiz') {
    const vocab = firstMeaningfulWords(note.body, 10);
    const questions = sentences.slice(0, 4).map((sentence, index) => {
      const prompt = `In your own words, explain: ${sentence.slice(0, 88)}${sentence.length > 88 ? '…' : ''}`;
      const answer = sentence;
      const options = deterministicShuffle([answer, `Relates mostly to ${vocab[index + 1] ?? 'context'} only.`, `No key idea is presented here.`, `It argues the opposite of the note.`], `${note.id}-${index}`).slice(0, 4);
      return {
        id: `${id}-q-${index}`,
        prompt,
        choices: options,
        answer,
        rationale: 'Compare your answer to the original note wording and keep what you can justify from the source text.'
      };
    });

    return {
      id,
      noteId: note.id,
      interactionType,
      title: 'Quiz me',
      label: 'AI study support',
      createdAt,
      sourceNoteUpdatedAt: note.updatedAt,
      generatedFrom: 'note-content',
      content: { kind: 'quiz_set', questions }
    };
  }

  if (interactionType === 'flashcards') {
    const cards = sentences.slice(0, 6).map((sentence, index) => ({
      id: `${id}-f-${index}`,
      prompt: `What does this note say about ${firstMeaningfulWords(sentence, 2).join(' ') || 'this idea'}?`,
      answer: sentence
    }));

    return {
      id,
      noteId: note.id,
      interactionType,
      title: 'Flashcards',
      label: 'AI study support',
      createdAt,
      sourceNoteUpdatedAt: note.updatedAt,
      generatedFrom: 'note-content',
      content: { kind: 'flashcard_set', cards }
    };
  }

  if (interactionType === 'review_recommendation') {
    const weakSignals = interactions.flatMap((entry) => entry.weakSignals ?? []);
    const recommendations = weakSignals.length
      ? weakSignals.slice(0, 4)
      : sentences.slice(0, 3).map((sentence) => `Review this concept: ${sentence.slice(0, 96)}${sentence.length > 96 ? '…' : ''}`);

    return {
      id,
      noteId: note.id,
      interactionType,
      title: 'Review next',
      label: 'AI study support',
      createdAt,
      sourceNoteUpdatedAt: note.updatedAt,
      generatedFrom: 'note-content',
      content: { kind: 'review_recommendation', recommendations, basis: weakSignals.length ? 'Based on your recent quiz/check interactions.' : 'No prior checks yet; showing most important concepts first.' }
    };
  }

  if (interactionType === 'answer_check') {
    if (!userAnswer?.trim()) return null;
    const reference = sentences[0];
    const overlap = firstMeaningfulWords(userAnswer, 8).filter((word) => reference.toLowerCase().includes(word));
    const confidence = overlap.length >= 4 ? 'high' : overlap.length >= 2 ? 'medium' : 'low';
    const evaluation = overlap.length
      ? `Good start. I can match ${overlap.length} key term${overlap.length === 1 ? '' : 's'} with the note.`
      : 'Your answer seems off-track from the current note wording.';
    const guidance = overlap.length >= 2
      ? 'Now tighten it: include one concrete detail and one causal link from the note.'
      : 'Try again using one exact concept from the note, then state why it matters.';

    return {
      id,
      noteId: note.id,
      interactionType,
      title: 'Check my answer',
      label: 'AI study support',
      createdAt,
      sourceNoteUpdatedAt: note.updatedAt,
      generatedFrom: 'note-content',
      content: { kind: 'answer_check', prompt: `Use this anchor idea: ${reference}`, learnerAnswer: userAnswer, evaluation, guidance, confidence }
    };
  }

  return null;
}

export function buildStudyInteraction(noteId: string, interactionType: StudyInteractionType, userResponse?: string, aiFeedback?: string): StudyInteraction {
  const weakSignals = aiFeedback && /off-track|try again|low/i.test(aiFeedback) ? [aiFeedback] : undefined;
  return {
    id: crypto.randomUUID(),
    noteId,
    interactionType,
    createdAt: now(),
    userResponse,
    aiFeedback,
    weakSignals
  };
}
