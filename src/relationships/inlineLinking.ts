import { getDisplayTitle, normalizeOptionalTitle } from '../noteText';
import { NoteCardModel, RelationshipType } from '../types';

export type InlineWikiLinkMatch = {
  start: number;
  end: number;
  query: string;
};

export type InferredInlineRelationship = {
  type: RelationshipType;
  reason: string;
};

export type ResolvedInlineLink = {
  label: string;
  start: number;
  end: number;
  targetId: string | null;
};

export type ProactiveLinkSuggestion = {
  id: string;
  targetId: string;
  targetTitle: string;
  type: RelationshipType;
  confidence: number;
  reason: string;
};

const INLINE_RELATIONSHIP_RULES: Array<{ type: RelationshipType; pattern: RegExp; reason: string }> = [
  { type: 'depends_on', pattern: /\b(depends on|blocked by|needs|waiting on|requires)\b/i, reason: 'Dependency language nearby.' },
  { type: 'supports', pattern: /\b(supports?|helps?|enables?|unblocks?|backs)\b/i, reason: 'Support language nearby.' },
  { type: 'contradicts', pattern: /\b(contradicts?|conflicts? with|however|but not|disagrees?)\b/i, reason: 'Conflict language nearby.' },
  { type: 'references', pattern: /\b(reference|source|citation|read|doc|article|spec|url|link)\b/i, reason: 'Reference language nearby.' },
  { type: 'part_of', pattern: /\b(part of|inside|within|belongs to|under)\b/i, reason: 'Structure language nearby.' },
  { type: 'leads_to', pattern: /\b(leads to|results in|causes|next step|outcome)\b/i, reason: 'Outcome language nearby.' },
  { type: 'derived_from', pattern: /\b(derived from|based on|adapted from|came from|origin)\b/i, reason: 'Provenance language nearby.' }
];

const STOP_WORDS = new Set(['the', 'and', 'with', 'that', 'this', 'from', 'into', 'about', 'note', 'your', 'have', 'after']);

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function extractKeywords(value: string) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function sharedCount(a: string[], b: string[]) {
  const bSet = new Set(b);
  return a.filter((token) => bSet.has(token)).length;
}

function getLineSlice(body: string, index: number) {
  const lineStart = body.lastIndexOf('\n', Math.max(0, index - 1)) + 1;
  const lineEndCandidate = body.indexOf('\n', index);
  const lineEnd = lineEndCandidate === -1 ? body.length : lineEndCandidate;
  return body.slice(lineStart, lineEnd);
}

export function findActiveWikiLink(body: string, cursor: number): InlineWikiLinkMatch | null {
  const searchArea = body.slice(0, cursor);
  const start = searchArea.lastIndexOf('[[');
  if (start === -1) return null;

  const closingBeforeCursor = searchArea.lastIndexOf(']]');
  if (closingBeforeCursor > start) return null;

  const closingAfterStart = body.indexOf(']]', start + 2);
  if (closingAfterStart !== -1 && cursor > closingAfterStart + 2) return null;

  const query = body.slice(start + 2, cursor);
  if (query.includes('\n') || query.includes('[') || query.includes(']')) return null;

  return { start, end: closingAfterStart === -1 ? cursor : closingAfterStart + 2, query };
}

export function inferRelationshipTypeFromContext(body: string, cursor: number): InferredInlineRelationship {
  const line = getLineSlice(body, cursor);
  const windowStart = Math.max(0, cursor - 100);
  const contextWindow = body.slice(windowStart, Math.min(body.length, cursor + 40));
  const combined = `${line} ${contextWindow}`;

  for (const rule of INLINE_RELATIONSHIP_RULES) {
    if (rule.pattern.test(combined)) return { type: rule.type, reason: rule.reason };
  }

  return { type: 'related', reason: 'No stronger context signal yet.' };
}

function scoreMatch(query: string, note: NoteCardModel) {
  const normalizedQuery = normalizeSearchText(query);
  const displayTitle = getDisplayTitle(note);
  const normalizedTitle = normalizeSearchText(displayTitle);
  if (!normalizedQuery) return normalizedTitle ? 0.5 : 0;
  if (normalizedTitle === normalizedQuery) return 12;
  if (normalizedTitle.startsWith(normalizedQuery)) return 10;
  if (normalizedTitle.includes(normalizedQuery)) return 7;

  const normalizedBody = normalizeSearchText(note.body);
  if (normalizedBody.includes(normalizedQuery)) return 3;
  return 0;
}

export function getMatchingNotes(notes: NoteCardModel[], sourceNoteId: string, query: string, limit = 6) {
  return notes
    .filter((note) => note.id !== sourceNoteId && !note.archived)
    .map((note) => ({ note, score: scoreMatch(query, note) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : getDisplayTitle(a.note).localeCompare(getDisplayTitle(b.note))))
    .slice(0, limit)
    .map((entry) => entry.note);
}

export function findNoteByWikiLabel(notes: NoteCardModel[], label: string) {
  const normalizedLabel = normalizeSearchText(normalizeOptionalTitle(label) ?? label);
  if (!normalizedLabel) return null;
  return notes.find((note) => !note.archived && normalizeSearchText(getDisplayTitle(note)) === normalizedLabel) ?? null;
}

export function extractResolvedInlineLinks(body: string, notes: NoteCardModel[]): ResolvedInlineLink[] {
  const matches = body.matchAll(/\[\[([^[\]\n]+)\]\]/g);
  return Array.from(matches).map((match) => {
    const label = match[1].trim();
    const target = findNoteByWikiLabel(notes, label);
    return {
      label,
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      targetId: target?.id ?? null
    } satisfies ResolvedInlineLink;
  });
}

type ProactiveSuggestionOptions = {
  source: NoteCardModel;
  notes: NoteCardModel[];
  existingTargetIds?: Set<string>;
  limit?: number;
};

export function getProactiveLinkSuggestions({
  source,
  notes,
  existingTargetIds = new Set<string>(),
  limit = 3
}: ProactiveSuggestionOptions): ProactiveLinkSuggestion[] {
  const sourceText = `${source.title ?? ''}\n${source.body}`;
  const normalizedSourceText = normalizeSearchText(sourceText);
  const sourceKeywords = extractKeywords(sourceText);
  const sourceProjectIds = new Set(source.projectIds);
  const heuristicMap = new Map((source.inferredRelationships ?? []).map((relationship) => [relationship.targetId, relationship]));

  const ranked = notes
    .filter((candidate) => candidate.id !== source.id && !candidate.archived && !existingTargetIds.has(candidate.id))
    .map((candidate) => {
      const targetTitle = getDisplayTitle(candidate);
      const normalizedTitle = normalizeSearchText(targetTitle);
      const titleExactScore = normalizedTitle.length >= 4 && normalizedSourceText.includes(normalizedTitle) ? 3.6 : 0;

      const titleKeywords = extractKeywords(targetTitle);
      const fuzzyTitleMatches = sharedCount(titleKeywords, sourceKeywords);
      const fuzzyTitleScore = Math.min(2.4, fuzzyTitleMatches * 0.9);

      const semanticMatches = sharedCount(extractKeywords(`${candidate.title ?? ''}\n${candidate.body}`), sourceKeywords);
      const semanticScore = Math.min(2.2, semanticMatches * 0.55);

      const sameProject = candidate.projectIds.some((projectId) => sourceProjectIds.has(projectId));
      const sameWorkspace = Boolean(source.workspaceId) && source.workspaceId === candidate.workspaceId;
      const contextScore = (sameProject ? 0.7 : 0) + (sameWorkspace ? 0.55 : 0);

      const heuristicSuggestion = heuristicMap.get(candidate.id) ?? null;
      const heuristicScore = heuristicSuggestion ? 0.95 : 0;

      const cueIndex = source.body.toLowerCase().indexOf(targetTitle.toLowerCase());
      const cue = inferRelationshipTypeFromContext(source.body, cueIndex >= 0 ? cueIndex : source.body.length);
      const cueScore = cue.type === 'related' ? 0.18 : 0.82;
      const type = heuristicSuggestion?.type ?? cue.type ?? 'related';

      const score = titleExactScore + fuzzyTitleScore + semanticScore + contextScore + heuristicScore + cueScore;
      const confidence = Math.max(0, Math.min(0.98, score / 8.6));
      const reason = titleExactScore
        ? 'Mentioned directly in this note.'
        : fuzzyTitleMatches >= 2
          ? 'Strong title overlap with what you are writing.'
          : semanticMatches >= 2
            ? 'Semantically close to the current note.'
            : sameProject || sameWorkspace
              ? 'Nearby in the current project or workspace context.'
              : heuristicSuggestion?.reason ?? cue.reason;

      return {
        id: `${source.id}:${candidate.id}:${type}`,
        targetId: candidate.id,
        targetTitle,
        type: type ?? 'related',
        confidence,
        score,
        reason
      };
    })
    .filter((candidate) => candidate.score >= 2)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.targetTitle.localeCompare(b.targetTitle)))
    .slice(0, limit);

  return ranked.map(({ id, targetId, targetTitle, type, confidence, reason }) => ({
    id,
    targetId,
    targetTitle,
    type: type ?? 'related',
    confidence,
    reason
  }));
}
