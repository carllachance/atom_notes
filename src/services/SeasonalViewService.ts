// Seasonal reflection view data service — pure functions, no React
import { NoteCardModel, Relationship } from '../types';

export interface MonthBucket {
  year: number;
  month: number;          // 0-indexed
  label: string;
  noteIds: string[];
  dominantTopics: string[];
  noteCount: number;
  relationshipCount: number;
  warmth: number;
}

export interface SeasonalViewData {
  buckets: MonthBucket[];
  peakMonth: MonthBucket;
  activeMonths: number;
  totalSpanMonths: number;
}

function getYearMonth(timestamp: number): { year: number; month: number } {
  const d = new Date(timestamp);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function bucketKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function computeSeasonalView(params: {
  notes: Map<string, NoteCardModel> | NoteCardModel[];
  relationships: Map<string, Relationship> | Relationship[];
  maxMonths?: number;
}): SeasonalViewData | null {
  const { maxMonths = 24 } = params;

  const notesArr: NoteCardModel[] = params.notes instanceof Map
    ? Array.from(params.notes.values())
    : params.notes;
  const relsArr: Relationship[] = params.relationships instanceof Map
    ? Array.from(params.relationships.values())
    : params.relationships;

  if (notesArr.length === 0) return null;

  // Group notes by year+month
  const notesByMonth = new Map<string, NoteCardModel[]>();
  for (const note of notesArr) {
    if (note.deleted || note.archived) continue;
    const { year, month } = getYearMonth(note.createdAt);
    const key = bucketKey(year, month);
    const bucket = notesByMonth.get(key) ?? [];
    bucket.push(note);
    notesByMonth.set(key, bucket);
  }

  // Group relationships by year+month
  const relsByMonth = new Map<string, number>();
  for (const rel of relsArr) {
    const { year, month } = getYearMonth(rel.createdAt);
    const key = bucketKey(year, month);
    relsByMonth.set(key, (relsByMonth.get(key) ?? 0) + 1);
  }

  if (notesByMonth.size === 0) return null;

  // Sort keys chronologically and limit to maxMonths
  const sortedKeys = Array.from(notesByMonth.keys()).sort();
  const limitedKeys = sortedKeys.slice(-maxMonths);

  // Build buckets
  let peakCount = 0;
  const rawBuckets: Omit<MonthBucket, 'warmth'>[] = limitedKeys.map((key) => {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const notes = notesByMonth.get(key) ?? [];
    const noteCount = notes.length;
    if (noteCount > peakCount) peakCount = noteCount;

    // dominantTopics: top 3 notes by updatedAt (most recently active)
    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    const dominantTopics = sorted.slice(0, 3).map((n) => (n.title ?? n.body ?? '').slice(0, 20));

    return {
      year,
      month,
      label: `${MONTH_NAMES[month]} ${year}`,
      noteIds: notes.map((n) => n.id),
      dominantTopics,
      noteCount,
      relationshipCount: relsByMonth.get(key) ?? 0,
    };
  });

  const buckets: MonthBucket[] = rawBuckets.map((b) => ({
    ...b,
    warmth: peakCount > 0 ? b.noteCount / peakCount : 0,
  }));

  const peakMonth = buckets.reduce((best, b) => (b.noteCount > best.noteCount ? b : best), buckets[0]);
  const activeMonths = buckets.filter((b) => b.noteCount > 0).length;

  // Compute total span
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  const totalSpanMonths = (last.year - first.year) * 12 + (last.month - first.month) + 1;

  return { buckets, peakMonth, activeMonths, totalSpanMonths };
}
