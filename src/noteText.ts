import { NoteCardModel } from './types';

const FALLBACK_TITLE = 'Quick note';

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function firstMeaningfulLine(value: string): string {
  return (
    value
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  );
}

function getDerivedTitleFromBody(body: string): string {
  const derived = normalizeInlineText(firstMeaningfulLine(body));
  return derived || FALLBACK_TITLE;
}

export function normalizeOptionalTitle(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeInlineText(value);
  return normalized ? normalized : null;
}

export function hasExplicitTitle(note: Pick<NoteCardModel, 'title'>): boolean {
  return normalizeOptionalTitle(note.title) !== null;
}

export function getDisplayTitle(note: Pick<NoteCardModel, 'title' | 'body'>): string {
  const explicit = normalizeOptionalTitle(note.title);
  return explicit ?? getDerivedTitleFromBody(note.body);
}

export function getCompactDisplayTitle(
  note: Pick<NoteCardModel, 'title' | 'body'>,
  maxLength = 44
): string {
  return truncate(getDisplayTitle(note), maxLength);
}

export function getSummaryPreview(note: Pick<NoteCardModel, 'body'>, maxLength = 120): string {
  const bodyText = normalizeInlineText(note.body);
  if (!bodyText) return 'No summary yet.';
  return truncate(bodyText, maxLength);
}
