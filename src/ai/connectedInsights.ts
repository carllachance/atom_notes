import { getRelationshipTargetNoteId, getRankedRelationshipsForNote } from '../relationshipLogic';
import { ActionSuggestion, AIInteractionMode, InsightsResponse, NoteCardModel, SceneState } from '../types';

export type ConnectedInsightsRequest = {
  query: string;
  selectedNoteId?: string;
  visibleNoteIds?: string[];
  activeProjectIds?: string[];
  recentNoteIds?: string[];
  mode?: AIInteractionMode;
};

function tokenize(value: string) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreNote(query: string, note: NoteCardModel, context: { selectedNoteId?: string; activeProjectIds: string[]; recentNoteIds: string[] }) {
  const reasons: string[] = [];
  let score = 0;
  const haystack = `${note.title ?? ''}\n${note.body}`.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryTokens = tokenize(query);

  if (queryLower && haystack.includes(queryLower)) {
    score += 5;
    reasons.push('direct match');
  }

  const overlap = queryTokens.filter((token) => haystack.includes(token)).length;
  if (overlap > 0) {
    score += overlap * 1.4;
    reasons.push('fuzzy match');
  }

  if (context.activeProjectIds.some((projectId) => note.projectIds.includes(projectId))) {
    score += 1.2;
    reasons.push('same project');
  }

  if (context.recentNoteIds.includes(note.id)) {
    score += 0.9;
    reasons.push('recently visited');
  }

  const ageDays = Math.max(0, (Date.now() - note.updatedAt) / (1000 * 60 * 60 * 24));
  score += 1 / (1 + ageDays * 0.2);
  if (score > 0 && !reasons.includes('recently updated')) reasons.push('recently updated');

  return { score, reasons };
}

function buildActions(mode: AIInteractionMode, topIds: string[]): ActionSuggestion[] {
  const base: ActionSuggestion[] = [
    {
      id: 'highlight-top',
      label: 'Highlight',
      kind: 'highlight_nodes',
      noteIds: topIds,
      requiresConfirmation: false
    }
  ];

  if (mode === 'explore' || mode === 'ask') {
    base.push({ id: 'focus-cluster', label: 'Focus cluster', kind: 'focus_cluster', noteIds: topIds, requiresConfirmation: true });
  }
  if (mode === 'summarize') {
    base.push({ id: 'create-summary', label: 'Create summary', kind: 'create_summary', noteIds: topIds, requiresConfirmation: true });
  }
  return base;
}

export async function runConnectedInsights(scene: SceneState, request: ConnectedInsightsRequest): Promise<InsightsResponse> {
  const mode = request.mode ?? 'ask';
  const visibleIdSet = new Set(request.visibleNoteIds ?? scene.notes.map((note) => note.id));
  const candidates = scene.notes.filter((note) => !note.archived && visibleIdSet.has(note.id));
  const activeProjectIds = request.activeProjectIds ?? [];
  const recentNoteIds = request.recentNoteIds ?? [];

  const ranked = candidates
    .map((note) => ({
      noteId: note.id,
      ...scoreNote(request.query, note, {
        selectedNoteId: request.selectedNoteId,
        activeProjectIds,
        recentNoteIds
      })
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (request.selectedNoteId) {
    const graphNeighbors = getRankedRelationshipsForNote(request.selectedNoteId, scene).slice(0, 4);
    for (const neighbor of graphNeighbors) {
      const targetId = getRelationshipTargetNoteId(neighbor.relationship, request.selectedNoteId);
      const existing = ranked.find((item) => item.noteId === targetId);
      if (existing) {
        existing.score += neighbor.score;
        existing.reasons.push(`connected via ${neighbor.relationship.type}`);
      }
    }
    ranked.sort((a, b) => b.score - a.score);
  }

  const topIds = ranked.slice(0, 3).map((item) => item.noteId);
  const answer = ranked.length
    ? `I found ${ranked.length} relevant notes grounded in the current graph. ${topIds.length ? 'The strongest matches are ready to inspect on the canvas.' : ''}`
    : 'I could not find a strong match in the visible graph yet.';

  return {
    answer,
    sections: [
      {
        id: 'summary',
        title: mode === 'summarize' ? 'Summary' : 'Grounded view',
        body: ranked.length
          ? ranked.slice(0, 3).map((result, index) => `${index + 1}. ${result.reasons.join(', ')}`).join('\n')
          : 'No strong graph-first candidates were found.'
      }
    ],
    references: topIds,
    results: ranked.map((item) => ({ noteId: item.noteId, score: Number(item.score.toFixed(3)), reasons: [...new Set(item.reasons)] })),
    actions: buildActions(mode, topIds)
  };
}
