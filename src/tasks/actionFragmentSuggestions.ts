import { NoteCardModel } from '../types';

export type ActionFragmentSuggestion = {
  id: string;
  start: number;
  end: number;
  text: string;
  reason: string;
};

const ACTION_VERB_PATTERN = /^(follow up|follow-up|review|send|draft|prepare|schedule|confirm|update|share|finalize|check|call|email|ask|plan|book|clarify|summarize|ship|fix|resolve|create|outline|capture|sync|decide|assign|publish|reply|submit)\b/i;
const ACTION_SIGNAL_PATTERN = /\b(todo|to do|next step|need to|should|action|follow up|follow-up|please|owner)\b/i;

function normalizeCandidateText(text: string) {
  return text
    .replace(/^[-*]\s+/, '')
    .replace(/^\[(?: |x)\]\s*/i, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();
}

function overlapsExistingPromotion(start: number, end: number, note: Pick<NoteCardModel, 'promotedTaskFragments'>) {
  return (note.promotedTaskFragments ?? []).some((fragment) => start < fragment.end && end > fragment.start);
}

export function getLikelyActionFragments(
  note: Pick<NoteCardModel, 'id' | 'body' | 'promotedTaskFragments' | 'intent'>,
  limit = 4
): ActionFragmentSuggestion[] {
  if (!note.body.trim() || note.intent === 'task') return [];

  const suggestions: ActionFragmentSuggestion[] = [];
  const seen = new Set<string>();
  let offset = 0;

  for (const rawLine of note.body.split('\n')) {
    const lineStart = offset;
    const lineEnd = offset + rawLine.length;
    offset = lineEnd + 1;

    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const normalized = normalizeCandidateText(trimmed);
    if (!normalized || normalized.length < 6 || normalized.length > 160) continue;

    const hasCheckbox = /^[-*]\s*\[(?: |x)\]/i.test(trimmed);
    const bulletLike = /^[-*]|^\d+[.)]/.test(trimmed);
    const actionable = ACTION_VERB_PATTERN.test(normalized) || ACTION_SIGNAL_PATTERN.test(normalized) || hasCheckbox;
    if (!actionable) continue;

    const localIndex = rawLine.indexOf(normalized);
    const start = lineStart + Math.max(0, localIndex);
    const end = start + normalized.length;
    if (overlapsExistingPromotion(start, end, note)) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const reason = hasCheckbox
      ? 'Checkbox-style follow-up surfaced from this note.'
      : bulletLike
        ? 'Action-oriented line surfaced from this note.'
        : 'Likely next step detected in the capture.';

    suggestions.push({
      id: `${note.id}-action-${suggestions.length + 1}`,
      start,
      end,
      text: normalized,
      reason
    });

    if (suggestions.length >= limit) break;
  }

  return suggestions;
}
