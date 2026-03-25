import { NoteCardModel } from '../types';
import { collectSemanticSignals } from '../notes/semanticSignals';

export type ActionFragmentSuggestion = {
  id: string;
  start: number;
  end: number;
  text: string;
  reason: string;
  semanticType?: 'follow_up';
  followUpStatus?: 'suggested' | 'accepted' | 'dismissed';
};

export type FollowUpLifecycleAction = 'accept' | 'dismiss' | 'promote_to_task';

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

function readFollowUpStatus(line: string): 'suggested' | 'accepted' | 'dismissed' {
  const match = line.match(/^\s*Follow-up(?:\s*\(([^)]*)\))?:\s*/i);
  const raw = match?.[1]?.trim().toLowerCase();
  if (raw === 'accepted') return 'accepted';
  if (raw === 'dismissed') return 'dismissed';
  return 'suggested';
}

function updateFollowUpLineStatus(line: string, status: 'accepted' | 'dismissed') {
  const textMatch = line.match(/^\s*Follow-up(?:\s*\([^)]*\))?:\s*(.*)$/i);
  const suffix = textMatch?.[1] ?? '';
  const indent = (line.match(/^\s*/) ?? [''])[0];
  return `${indent}Follow-up (${status}): ${suffix}`;
}

export function applyFollowUpLifecycleAction(source: string, suggestion: Pick<ActionFragmentSuggestion, 'start' | 'end' | 'semanticType'>, action: FollowUpLifecycleAction) {
  if (suggestion.semanticType !== 'follow_up') return source;
  if (action === 'promote_to_task' || action === 'accept') {
    return replaceFollowUpLineAtRange(source, suggestion.start, 'accepted');
  }
  return replaceFollowUpLineAtRange(source, suggestion.start, 'dismissed');
}

function replaceFollowUpLineAtRange(source: string, rangeStart: number, status: 'accepted' | 'dismissed') {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const lineStart = offset;
    const lineEnd = lineStart + lines[i].length;
    offset = lineEnd + 1;
    if (rangeStart < lineStart || rangeStart > lineEnd) continue;
    if (!/^\s*Follow-up(?:\s*\([^)]*\))?:\s*/i.test(lines[i])) return source;
    lines[i] = updateFollowUpLineStatus(lines[i], status);
    return lines.join('\n');
  }
  return source;
}

export function getLikelyActionFragments(
  note: Pick<NoteCardModel, 'id' | 'body' | 'promotedTaskFragments' | 'intent'>,
  limit = 4
): ActionFragmentSuggestion[] {
  if (!note.body.trim() || note.intent === 'task') return [];

  const suggestions: ActionFragmentSuggestion[] = [];
  const seen = new Set<string>();

  const semanticFollowUps = collectSemanticSignals(note.body).filter((signal) => signal.type === 'follow_up');
  semanticFollowUps.forEach((signal) => {
    if (suggestions.length >= limit) return;
    if (overlapsExistingPromotion(signal.start, signal.end, note)) return;
    const key = signal.text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const line = note.body.slice(0, signal.start).split('\n').pop() ?? '';
    const fullLine = `${line}${note.body.slice(signal.start, note.body.indexOf('\n', signal.start) === -1 ? undefined : note.body.indexOf('\n', signal.start))}`;
    const followUpStatus = readFollowUpStatus(fullLine);
    if (followUpStatus === 'dismissed') return;

    suggestions.push({
      id: `${note.id}-follow-up-${suggestions.length + 1}`,
      start: signal.start,
      end: signal.end,
      text: signal.text,
      reason: followUpStatus === 'accepted'
        ? 'Accepted follow-up kept visible for optional task promotion.'
        : 'Follow-up semantic block surfaced for optional task promotion.',
      semanticType: 'follow_up',
      followUpStatus
    });
  });

  if (suggestions.length >= limit) return suggestions;

  let offset = 0;

  for (const rawLine of note.body.split('\n')) {
    const lineStart = offset;
    const lineEnd = offset + rawLine.length;
    offset = lineEnd + 1;

    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (/^\s*Follow-up\s*\(\s*dismissed\s*\):/i.test(trimmed)) continue;

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
