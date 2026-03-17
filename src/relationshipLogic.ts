import { NoteCardModel, Relationship, RelationshipType, SceneState } from './types';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'have',
  'your',
  'into',
  'about',
  'note'
]);

const KEYWORD_MIN_LENGTH = 4;
const INFERRED_CONFIDENCE_BASE = 0.45;
const STALE_CONFIRMED_INFERRED_PENALTY = 0.86;

type RankedRelationship = {
  relationship: Relationship;
  score: number;
};

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s:/._-]/g, ' ');
}

function extractKeywords(note: NoteCardModel): string[] {
  const text = normalizeText(`${note.title} ${note.body}`);
  const tokens = text.split(/\s+/).filter(Boolean);
  return [...new Set(tokens.filter((token) => token.length >= KEYWORD_MIN_LENGTH && !STOP_WORDS.has(token)))];
}

function extractUrls(note: NoteCardModel): string[] {
  const matches = `${note.title} ${note.body}`.match(/https?:\/\/[^\s)]+/gi);
  return matches ? [...new Set(matches.map((url) => url.toLowerCase()))] : [];
}

export function relationshipPairKey(fromId: string, toId: string, type: RelationshipType) {
  const [a, b] = [fromId, toId].sort();
  return `${a}:${b}:${type}`;
}

function hashId(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `rel-${Math.abs(hash)}`;
}

function dedupePriority(relationship: Relationship) {
  const explicitnessRank = relationship.explicitness === 'explicit' ? 3 : 1;
  const stateRank = relationship.state === 'confirmed' ? 2 : 1;
  const supportRank = relationship.heuristicSupported ? 1 : 0;
  return explicitnessRank * 100 + stateRank * 10 + supportRank;
}

function dedupeRelationships(relationships: Relationship[]) {
  const byKey = new Map<string, Relationship>();

  for (const relationship of relationships) {
    const key = relationshipPairKey(relationship.fromId, relationship.toId, relationship.type);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, relationship);
      continue;
    }

    const nextPriority = dedupePriority(relationship);
    const currentPriority = dedupePriority(current);
    if (nextPriority > currentPriority) {
      byKey.set(key, relationship);
      continue;
    }

    if (nextPriority === currentPriority && relationship.lastActiveAt > current.lastActiveAt) {
      byKey.set(key, relationship);
    }
  }

  return Array.from(byKey.values());
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
        const pair = relationshipPairKey(a.id, b.id, 'references');
        inferred.push({
          id: hashId(`inferred:${pair}`),
          fromId: a.id,
          toId: b.id,
          type: 'references',
          state: 'proposed',
          explicitness: 'inferred',
          confidence: Math.min(0.95, 0.6 + sharedUrls.length * 0.15),
          explanation: `Both notes include the same URL: ${sharedUrls[0]}`,
          heuristicSupported: true,
          createdAt: nowTs,
          lastActiveAt: nowTs
        });
        continue;
      }

      const keywordsA = extractKeywords(a);
      const keywordsB = extractKeywords(b);
      const sharedKeywords = keywordsA.filter((keyword) => keywordsB.includes(keyword)).slice(0, 3);
      if (sharedKeywords.length < 2) continue;

      const pair = relationshipPairKey(a.id, b.id, 'related_concept');
      inferred.push({
        id: hashId(`inferred:${pair}`),
        fromId: a.id,
        toId: b.id,
        type: 'related_concept',
        state: 'proposed',
        explicitness: 'inferred',
        confidence: Math.min(0.9, INFERRED_CONFIDENCE_BASE + sharedKeywords.length * 0.12),
        explanation: `Shared keywords: ${sharedKeywords.join(', ')}`,
        heuristicSupported: true,
        createdAt: nowTs,
        lastActiveAt: nowTs
      });
    }
  }

  return inferred;
}

export function refreshInferredRelationships(notes: NoteCardModel[], relationships: Relationship[], nowTs: number) {
  const normalizedExisting = dedupeRelationships(relationships);
  const inferredCandidates = collectInferenceCandidates(notes, nowTs);
  const candidateIds = new Set(inferredCandidates.map((relationship) => relationship.id));
  const existingById = new Map(normalizedExisting.map((relationship) => [relationship.id, relationship]));

  const persisted = normalizedExisting
    .filter((relationship) => relationship.explicitness === 'explicit')
    .map((relationship) => ({ ...relationship, heuristicSupported: true }));

  const staleConfirmedInferred = normalizedExisting
    .filter(
      (relationship) =>
        relationship.explicitness === 'inferred' &&
        relationship.state === 'confirmed' &&
        !candidateIds.has(relationship.id)
    )
    .map((relationship) => ({ ...relationship, heuristicSupported: false }));

  const mergedInferred = inferredCandidates.map((candidate) => {
    const existing = existingById.get(candidate.id);
    if (!existing) return candidate;

    return {
      ...candidate,
      state: existing.state,
      createdAt: existing.createdAt,
      lastActiveAt: existing.lastActiveAt,
      heuristicSupported: true
    };
  });

  return dedupeRelationships([...persisted, ...staleConfirmedInferred, ...mergedInferred]);
}

function scoreRelationship(relationship: Relationship, nowTs: number) {
  const explicitnessBoost = relationship.explicitness === 'explicit' ? 1.2 : 0.8;
  const typeWeight = relationship.type === 'references' ? 1.05 : 1;
  const stateWeight = relationship.state === 'confirmed' ? 1 : 0.78;
  const stalePenalty =
    relationship.explicitness === 'inferred' && relationship.state === 'confirmed' && !relationship.heuristicSupported
      ? STALE_CONFIRMED_INFERRED_PENALTY
      : 1;
  const daysSinceActive = Math.max(0, (nowTs - relationship.lastActiveAt) / (1000 * 60 * 60 * 24));
  const recencyWeight = 1 / (1 + daysSinceActive * 0.25);

  return explicitnessBoost * typeWeight * stateWeight * stalePenalty * recencyWeight * relationship.confidence;
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
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.relationship.id.localeCompare(b.relationship.id);
    });

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
