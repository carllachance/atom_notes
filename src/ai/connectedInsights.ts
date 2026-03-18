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
  const topId = topIds[0];
  const base: ActionSuggestion[] = topIds.length
    ? [
        {
          id: 'highlight-top',
          label: 'Highlight related notes',
          kind: 'highlight_nodes',
          noteIds: topIds,
          requiresConfirmation: false
        },
        {
          id: 'pin-answer',
          label: 'Pin as note',
          kind: 'pin_to_note',
          noteIds: topIds,
          requiresConfirmation: true
        }
      ]
    : [];

  if (mode === 'explore' || mode === 'ask') {
    base.push({ id: 'focus-cluster', label: 'Focus this cluster', kind: 'focus_cluster', noteIds: topIds, requiresConfirmation: true });
  }
  if (mode === 'summarize') {
    base.push({ id: 'create-summary', label: 'Create summary note', kind: 'create_summary', noteIds: topIds, requiresConfirmation: true });
  }
  if (topId) {
    base.push({ id: 'append-note', label: 'Add to current note', kind: 'append_to_note', noteId: topId, noteIds: topIds, requiresConfirmation: true });
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
  const strongest = ranked[0];
  const currentNote = request.selectedNoteId ? scene.notes.find((note) => note.id === request.selectedNoteId) ?? null : null;
  const answer = ranked.length
    ? currentNote
      ? `From ${currentNote.title ?? 'this note'}, the strongest graph paths point toward ${topIds.length} nearby note${topIds.length === 1 ? '' : 's'} that can help next.`
      : `I found ${ranked.length} relevant notes grounded in the current canvas graph.`
    : 'I could not find a strong match in the visible graph yet.';
  const summaryLines = ranked.slice(0, 3).map((result, index) => `${index + 1}. ${result.reasons.join(', ')}`);
  const responseSummary = [answer, ...summaryLines].join('\n');
  const actions = buildActions(mode, topIds).map((action) => ({
    ...action,
    summary: responseSummary,
    relationships:
      action.kind === 'create_link' && request.selectedNoteId && strongest
        ? [{ fromId: request.selectedNoteId, toId: strongest.noteId, type: 'related' as const }]
        : action.relationships
  }));

  if (request.selectedNoteId && strongest) {
    actions.push({
      id: 'link-strongest',
      label: `Link ${scene.notes.find((note) => note.id === strongest.noteId)?.title ?? 'strongest match'}`,
      kind: 'create_link',
      noteIds: [strongest.noteId],
      relationships: [{ fromId: request.selectedNoteId, toId: strongest.noteId, type: 'related' }],
      requiresConfirmation: true,
      summary: responseSummary
    });
  }

  return {
    answer,
    sections: [
      {
        id: 'summary',
        title: mode === 'summarize' ? 'Synthesis' : 'Grounded view',
        body: ranked.length ? summaryLines.join('\n') : 'No strong graph-first candidates were found.'
      }
    ],
    references: topIds,
    results: ranked.map((item) => ({ noteId: item.noteId, score: Number(item.score.toFixed(3)), reasons: [...new Set(item.reasons)] })),
    actions,
    highlightNoteIds: topIds
  };
}
