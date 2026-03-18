import { NoteCardModel, Relationship, RelationshipFilter, RelationshipState, RelationshipType, SceneState } from './types';

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
const ACTIVE_WINDOW_DAYS = 3;
const COOLING_WINDOW_DAYS = 10;
const HISTORICAL_WINDOW_DAYS = 28;
const ACTIVE_REINFORCEMENT_THRESHOLD = 0.72;
const REINFORCEMENT_INCREMENT = 0.18;
const REINFORCEMENT_DECAY_PER_DAY = 0.012;
const MIN_REINFORCEMENT = 0.18;
const MAX_VISIBLE_RELATIONSHIPS = 10;

export type RankedRelationship = {
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
  const explicitnessRank = relationship.explicitness === 'explicit' ? 4 : 1;
  const stateRank =
    relationship.state === 'active'
      ? 5
      : relationship.state === 'confirmed'
        ? 4
        : relationship.state === 'cooling'
          ? 3
          : relationship.state === 'historical'
            ? 2
            : relationship.state === 'rejected'
              ? 0
              : 1;
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

function normalizeReinforcementScore(score: number, daysSinceActive: number) {
  const decayed = score - daysSinceActive * REINFORCEMENT_DECAY_PER_DAY;
  return Math.min(1, Math.max(MIN_REINFORCEMENT, decayed));
}

function deriveLifecycleState(
  relationship: Relationship,
  nowTs: number,
  reinforcementScore = relationship.reinforcementScore
): RelationshipState {
  if (relationship.state === 'rejected' || relationship.state === 'superseded') return relationship.state;

  const daysSinceActive = Math.max(0, (nowTs - relationship.lastActiveAt) / (1000 * 60 * 60 * 24));

  if (relationship.explicitness === 'inferred' && relationship.state === 'proposed') {
    if (daysSinceActive >= COOLING_WINDOW_DAYS) return 'cooling';
    return 'proposed';
  }

  if (daysSinceActive <= ACTIVE_WINDOW_DAYS || reinforcementScore >= ACTIVE_REINFORCEMENT_THRESHOLD) {
    return 'active';
  }

  if (daysSinceActive <= COOLING_WINDOW_DAYS) {
    return relationship.state === 'historical' ? 'historical' : 'cooling';
  }

  if (daysSinceActive <= HISTORICAL_WINDOW_DAYS) {
    return relationship.state === 'confirmed' && relationship.explicitness === 'explicit' ? 'cooling' : 'historical';
  }

  return 'historical';
}

function syncRelationshipLifecycle(relationship: Relationship, nowTs: number): Relationship {
  const daysSinceActive = Math.max(0, (nowTs - relationship.lastActiveAt) / (1000 * 60 * 60 * 24));
  const reinforcementScore = normalizeReinforcementScore(relationship.reinforcementScore, daysSinceActive);
  return {
    ...relationship,
    reinforcementScore,
    state: deriveLifecycleState(relationship, nowTs, reinforcementScore)
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
        const pair = relationshipPairKey(a.id, b.id, 'references');
        inferred.push({
          id: hashId(`inferred:${pair}`),
          fromId: a.id,
          toId: b.id,
          type: 'references',
          state: 'proposed',
          explicitness: 'inferred',
          confidence: Math.min(0.95, 0.6 + sharedUrls.length * 0.15),
          reinforcementScore: 0.4,
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
        reinforcementScore: 0.38,
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
  const normalizedExisting = dedupeRelationships(relationships).map((relationship) => syncRelationshipLifecycle(relationship, nowTs));
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
        relationship.state !== 'rejected' &&
        relationship.state !== 'superseded' &&
        relationship.state !== 'proposed' &&
        !candidateIds.has(relationship.id)
    )
    .map((relationship) =>
      syncRelationshipLifecycle(
        {
          ...relationship,
          heuristicSupported: false
        },
        nowTs
      )
    );

  const mergedInferred = inferredCandidates.map((candidate) => {
    const existing = existingById.get(candidate.id);
    if (!existing) return candidate;

    return syncRelationshipLifecycle(
      {
        ...candidate,
        state: existing.state,
        reinforcementScore: existing.reinforcementScore,
        createdAt: existing.createdAt,
        lastActiveAt: existing.lastActiveAt,
        heuristicSupported: true
      },
      nowTs
    );
  });

  return dedupeRelationships([...persisted, ...staleConfirmedInferred, ...mergedInferred]).map((relationship) =>
    syncRelationshipLifecycle(relationship, nowTs)
  );
}

function scoreRelationship(relationship: Relationship, nowTs: number) {
  const explicitnessBoost = relationship.explicitness === 'explicit' ? 1.2 : 0.8;
  const typeWeight = relationship.type === 'references' ? 1.05 : 1;
  const stateWeight =
    relationship.state === 'active'
      ? 1.12
      : relationship.state === 'confirmed'
        ? 1
        : relationship.state === 'cooling'
          ? 0.82
          : relationship.state === 'historical'
            ? 0.52
            : 0.7;
  const stalePenalty =
    relationship.explicitness === 'inferred' && relationship.state !== 'proposed' && !relationship.heuristicSupported
      ? STALE_CONFIRMED_INFERRED_PENALTY
      : 1;
  const daysSinceActive = Math.max(0, (nowTs - relationship.lastActiveAt) / (1000 * 60 * 60 * 24));
  const recencyWeight = 1 / (1 + daysSinceActive * 0.25);
  const reinforcementWeight = 0.86 + relationship.reinforcementScore * 0.28;

  return explicitnessBoost * typeWeight * stateWeight * stalePenalty * recencyWeight * reinforcementWeight * relationship.confidence;
}

export function isHistoricalRelationship(relationship: Relationship) {
  return relationship.state === 'historical' || relationship.state === 'superseded';
}

export function isRenderableRelationship(relationship: Relationship, filter: RelationshipFilter) {
  if (relationship.state === 'rejected') return false;
  if (filter === 'history') return isHistoricalRelationship(relationship);
  if (filter === 'all') return !isHistoricalRelationship(relationship);
  return relationship.type === filter && !isHistoricalRelationship(relationship);
}

export function getRankedRelationshipsForNote(noteId: string, scene: SceneState, filter: RelationshipFilter = 'all'): RankedRelationship[] {
  const nowTs = Date.now();
  const notesById = new Map(scene.notes.map((note) => [note.id, note]));
  const connected = dedupeRelationships(
    scene.relationships.filter((relationship) => {
      if (relationship.fromId !== noteId && relationship.toId !== noteId) return false;
      if (!isRenderableRelationship(relationship, filter)) return false;
      const targetId = relationship.fromId === noteId ? relationship.toId : relationship.fromId;
      return !notesById.get(targetId)?.archived;
    })
  );

  return connected
    .map((relationship) => ({ relationship, score: scoreRelationship(relationship, nowTs) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.relationship.id.localeCompare(b.relationship.id);
    })
    .slice(0, MAX_VISIBLE_RELATIONSHIPS);
}

export function getRelationshipTargetNoteId(relationship: Relationship, currentNoteId: string) {
  return relationship.fromId === currentNoteId ? relationship.toId : relationship.fromId;
}

export function getRelationshipExplanation(relationship: Relationship) {
  if (relationship.explicitness !== 'inferred') return relationship.explanation;
  if (relationship.heuristicSupported) return relationship.explanation;
  return `${relationship.explanation} (no longer supported by current heuristic)`;
}

export function getRelationshipStateLabel(relationship: Relationship) {
  if (relationship.state === 'active') return 'Active now';
  if (relationship.state === 'cooling') return 'Cooling';
  if (relationship.state === 'historical') return 'Historical';
  if (relationship.state === 'confirmed') return 'Confirmed';
  if (relationship.state === 'proposed') return 'Proposed';
  if (relationship.state === 'superseded') return 'Superseded';
  return 'Rejected';
}

export function reinforceRelationship(
  relationship: Relationship,
  nowTs: number,
  mode: 'confirm' | 'traverse' | 'edit' = 'traverse'
): Relationship {
  const boost = mode === 'confirm' ? REINFORCEMENT_INCREMENT + 0.1 : mode === 'edit' ? REINFORCEMENT_INCREMENT * 0.75 : REINFORCEMENT_INCREMENT;
  const nextBaseState: RelationshipState =
    mode === 'confirm' && relationship.state === 'proposed'
      ? 'confirmed'
      : relationship.state === 'historical'
        ? 'active'
        : relationship.state;

  const reinforced: Relationship = syncRelationshipLifecycle(
    {
      ...relationship,
      state: nextBaseState,
      heuristicSupported: relationship.explicitness === 'explicit' ? true : relationship.heuristicSupported,
      reinforcementScore: Math.min(1, relationship.reinforcementScore + boost),
      lastActiveAt: nowTs
    },
    nowTs
  );

  if (mode === 'confirm' && relationship.state === 'proposed') {
    return { ...reinforced, state: 'confirmed' };
  }

  return reinforced;
}
