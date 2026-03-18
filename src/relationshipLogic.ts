import { NoteCardModel, Relationship, RelationshipType, SceneState, SuggestedRelationship } from './types';

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'your', 'into', 'about', 'note']);
const KEYWORD_MIN_LENGTH = 4;
const STALE_CONFIRMED_INFERRED_PENALTY = 0.86;

const TYPE_WEIGHTS: Record<RelationshipType, number> = {
  related: 1,
  references: 1.08,
  depends_on: 1.14,
  supports: 1.04,
  contradicts: 1.16,
  part_of: 1.05,
  leads_to: 1.06,
  derived_from: 1.09
};

const TYPE_DIRECTIONAL: Record<RelationshipType, boolean> = {
  related: false,
  references: true,
  depends_on: true,
  supports: true,
  contradicts: false,
  part_of: true,
  leads_to: true,
  derived_from: true
};

const PHRASE_RELATIONSHIPS: Array<{ pattern: RegExp; type: RelationshipType; reason: string }> = [
  { pattern: /depends on/i, type: 'depends_on', reason: 'Contains “depends on”.' },
  { pattern: /supports?/i, type: 'supports', reason: 'Contains “supports”.' },
  { pattern: /contradicts?|conflicts with/i, type: 'contradicts', reason: 'Contains contradiction language.' },
  { pattern: /part of/i, type: 'part_of', reason: 'Contains “part of”.' },
  { pattern: /leads to|results in/i, type: 'leads_to', reason: 'Contains outcome language.' },
  { pattern: /derived from|based on/i, type: 'derived_from', reason: 'Contains provenance language.' }
];

type RankedRelationship = {
  relationship: Relationship;
  score: number;
};

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s:/._#-]/g, ' ');
}

function extractKeywords(note: NoteCardModel): string[] {
  const text = normalizeText(`${note.title ?? ''} ${note.body}`);
  const tokens = text.split(/\s+/).filter(Boolean);
  return [...new Set(tokens.filter((token) => token.length >= KEYWORD_MIN_LENGTH && !STOP_WORDS.has(token)))];
}

function extractUrls(note: NoteCardModel): string[] {
  const matches = `${note.title ?? ''} ${note.body}`.match(/https?:\/\/[^\s)]+/gi);
  return matches ? [...new Set(matches.map((url) => url.toLowerCase()))] : [];
}

function normalizeRelationshipType(raw: unknown): RelationshipType {
  switch (raw) {
    case 'references':
    case 'depends_on':
    case 'supports':
    case 'contradicts':
    case 'part_of':
    case 'leads_to':
    case 'derived_from':
    case 'related':
      return raw;
    case 'related_concept':
      return 'related';
    default:
      return 'related';
  }
}

export function relationshipPairKey(fromId: string, toId: string, type: RelationshipType, directional = TYPE_DIRECTIONAL[type]) {
  if (directional) return `${fromId}->${toId}:${type}`;
  const [a, b] = [fromId, toId].sort();
  return `${a}:${b}:${type}`;
}

function hashId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return `rel-${Math.abs(hash)}`;
}

function dedupePriority(relationship: Relationship) {
  const explicitnessRank = relationship.explicitness === 'explicit' ? 4 : 1;
  const stateRank = relationship.state === 'confirmed' ? 2 : 1;
  const supportRank = relationship.heuristicSupported ? 1 : 0;
  return explicitnessRank * 100 + stateRank * 10 + supportRank;
}

function dedupeRelationships(relationships: Relationship[]) {
  const byKey = new Map<string, Relationship>();

  for (const rawRelationship of relationships) {
    const relationship = { ...rawRelationship, type: normalizeRelationshipType(rawRelationship.type) };
    const key = relationshipPairKey(relationship.fromId, relationship.toId, relationship.type, relationship.directional);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, relationship);
      continue;
    }

    const nextPriority = dedupePriority(relationship);
    const currentPriority = dedupePriority(current);
    if (nextPriority > currentPriority || (nextPriority === currentPriority && relationship.lastActiveAt > current.lastActiveAt)) {
      byKey.set(key, relationship);
    }
  }

  return Array.from(byKey.values());
}

function makeInferredRelationship(
  fromId: string,
  toId: string,
  type: RelationshipType,
  confidence: number,
  explanation: string,
  nowTs: number
): Relationship {
  const directional = TYPE_DIRECTIONAL[type];
  const pair = relationshipPairKey(fromId, toId, type, directional);
  return {
    id: hashId(`inferred:${pair}`),
    fromId,
    toId,
    type,
    state: 'proposed',
    explicitness: 'inferred',
    directional,
    confidence,
    isInferred: true,
    explanation,
    heuristicSupported: true,
    createdAt: nowTs,
    lastActiveAt: nowTs
  };
}

function collectInferenceCandidates(notes: NoteCardModel[], nowTs: number): Relationship[] {
  const inferred: Relationship[] = [];

  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      const a = notes[i];
      const b = notes[j];
      if (a.archived || b.archived) continue;

      const urlsA = extractUrls(a);
      const urlsB = extractUrls(b);
      const sharedUrls = urlsA.filter((url) => urlsB.includes(url));
      if (sharedUrls.length > 0) {
        inferred.push(makeInferredRelationship(a.id, b.id, 'references', Math.min(0.95, 0.62 + sharedUrls.length * 0.14), `Both notes include ${sharedUrls[0]}.`, nowTs));
        continue;
      }

      for (const rule of PHRASE_RELATIONSHIPS) {
        if (rule.pattern.test(`${a.title ?? ''}\n${a.body}`) && rule.pattern.test(`${b.title ?? ''}\n${b.body}`)) {
          inferred.push(makeInferredRelationship(a.id, b.id, rule.type, 0.62, rule.reason, nowTs));
          break;
        }
      }

      const keywordsA = extractKeywords(a);
      const keywordsB = extractKeywords(b);
      const sharedKeywords = keywordsA.filter((keyword) => keywordsB.includes(keyword)).slice(0, 3);
      if (sharedKeywords.length >= 2) {
        inferred.push(makeInferredRelationship(a.id, b.id, 'related', Math.min(0.88, 0.44 + sharedKeywords.length * 0.12), `Shared keywords: ${sharedKeywords.join(', ')}`, nowTs));
      }
    }
  }

  return inferred;
}

export function refreshInferredRelationships(notes: NoteCardModel[], relationships: Relationship[], nowTs: number) {
  const normalizedExisting = dedupeRelationships(relationships.map((relationship) => ({ ...relationship, type: normalizeRelationshipType(relationship.type) })));
  const inferredCandidates = collectInferenceCandidates(notes, nowTs);
  const candidateIds = new Set(inferredCandidates.map((relationship) => relationship.id));
  const existingById = new Map(normalizedExisting.map((relationship) => [relationship.id, relationship]));

  const persisted = normalizedExisting.filter((relationship) => relationship.explicitness === 'explicit').map((relationship) => ({
    ...relationship,
    heuristicSupported: true,
    isInferred: false,
    directional: relationship.directional ?? TYPE_DIRECTIONAL[relationship.type]
  }));

  const staleConfirmedInferred = normalizedExisting
    .filter(
      (relationship) => relationship.explicitness === 'inferred' && relationship.state === 'confirmed' && !candidateIds.has(relationship.id)
    )
    .map((relationship) => ({ ...relationship, heuristicSupported: false, isInferred: true }));

  const mergedInferred = inferredCandidates.map((candidate) => {
    const existing = existingById.get(candidate.id);
    if (!existing) return candidate;

    return {
      ...candidate,
      state: existing.state,
      createdAt: existing.createdAt,
      lastActiveAt: existing.lastActiveAt,
      heuristicSupported: true,
      confidence: existing.confidence ?? candidate.confidence,
      isInferred: true
    };
  });

  return dedupeRelationships([...persisted, ...staleConfirmedInferred, ...mergedInferred]);
}

function scoreRelationship(relationship: Relationship, nowTs: number) {
  const explicitnessBoost = relationship.explicitness === 'explicit' ? 1.2 : 0.82;
  const typeWeight = TYPE_WEIGHTS[relationship.type] ?? 1;
  const stateWeight = relationship.state === 'confirmed' ? 1 : 0.78;
  const stalePenalty = relationship.explicitness === 'inferred' && relationship.state === 'confirmed' && !relationship.heuristicSupported
    ? STALE_CONFIRMED_INFERRED_PENALTY
    : 1;
  const daysSinceActive = Math.max(0, (nowTs - relationship.lastActiveAt) / (1000 * 60 * 60 * 24));
  const recencyWeight = 1 / (1 + daysSinceActive * 0.25);

  return explicitnessBoost * typeWeight * stateWeight * stalePenalty * recencyWeight * (relationship.confidence ?? 0.5);
}

function isStaleConfirmedInferred(relationship: Relationship) {
  return relationship.explicitness === 'inferred' && relationship.state === 'confirmed' && !relationship.heuristicSupported;
}

export function getRankedRelationshipsForNote(noteId: string, scene: SceneState): RankedRelationship[] {
  const nowTs = Date.now();
  const notesById = new Map(scene.notes.map((note) => [note.id, note]));
  const connected = dedupeRelationships(
    scene.relationships.filter((relationship) => {
      if (relationship.fromId !== noteId && relationship.toId !== noteId) return false;
      const targetId = relationship.fromId === noteId ? relationship.toId : relationship.fromId;
      return !notesById.get(targetId)?.archived;
    })
  );

  const ranked = connected
    .map((relationship) => ({ relationship, score: scoreRelationship(relationship, nowTs) }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.relationship.id.localeCompare(b.relationship.id)));

  const topTen = ranked.slice(0, 10);
  const hasStaleInTopTen = topTen.some((item) => isStaleConfirmedInferred(item.relationship));
  if (hasStaleInTopTen) return topTen;

  const staleCandidate = ranked.find((item) => isStaleConfirmedInferred(item.relationship));
  if (!staleCandidate) return topTen;
  if (topTen.some((item) => item.relationship.id === staleCandidate.relationship.id)) return topTen;
  if (topTen.length === 0) return [staleCandidate];
  if (topTen.length < 10) return [...topTen, staleCandidate];
  return [...topTen.slice(0, 9), staleCandidate];
}

export function getRelationshipTargetNoteId(relationship: Relationship, currentNoteId: string) {
  return relationship.fromId === currentNoteId ? relationship.toId : relationship.fromId;
}

export function getRelationshipExplanation(relationship: Relationship) {
  if (relationship.explicitness !== 'inferred') return relationship.explanation;
  if (relationship.heuristicSupported) return relationship.explanation;
  return `${relationship.explanation} (no longer supported by current heuristic)`;
}

export function inferSuggestedRelationships(source: NoteCardModel, notes: NoteCardModel[]): SuggestedRelationship[] {
  const sourceText = `${source.title ?? ''}\n${source.body}`;
  const suggestions: SuggestedRelationship[] = [];

  for (const note of notes) {
    if (note.id === source.id || note.archived) continue;
    const targetText = `${note.title ?? ''}\n${note.body}`;

    if (source.title && note.title && source.title.trim().toLowerCase() === note.title.trim().toLowerCase()) {
      suggestions.push({
        id: `${source.id}-${note.id}-duplicate`,
        targetId: note.id,
        targetTitle: note.title,
        type: 'related',
        confidence: 0.88,
        directional: false,
        reason: 'Exact title match.',
        createdAt: nowTsFallback()
      });
    }

    for (const rule of PHRASE_RELATIONSHIPS) {
      if (rule.pattern.test(sourceText) && rule.pattern.test(targetText)) {
        suggestions.push({
          id: `${source.id}-${note.id}-${rule.type}`,
          targetId: note.id,
          targetTitle: note.title ?? note.body.slice(0, 48),
          type: rule.type,
          confidence: 0.68,
          directional: TYPE_DIRECTIONAL[rule.type],
          reason: rule.reason,
          createdAt: nowTsFallback()
        });
      }
    }
  }

  return suggestions.slice(0, 6);
}

function nowTsFallback() {
  return Date.now();
}

export function inferProjectMembership(note: NoteCardModel, projects: SceneState['projects']): string[] {
  const text = `${note.title ?? ''}\n${note.body}`;
  const inferred = new Set<string>();

  const hashtagMatches = [...text.matchAll(/#([a-z0-9_-]+)/gi)].map((match) => match[1].toUpperCase());
  const projectMatches = [...text.matchAll(/project:\s*([^\n]+)/gi)].map((match) => match[1].trim().toLowerCase());

  for (const project of projects) {
    if (hashtagMatches.includes(project.key.toUpperCase())) inferred.add(project.id);
    if (projectMatches.some((value) => value === project.name.toLowerCase() || value === project.key.toLowerCase())) {
      inferred.add(project.id);
    }
  }

  return [...inferred];
}
