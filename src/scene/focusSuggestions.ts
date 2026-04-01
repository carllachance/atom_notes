import { NoteCardModel, Relationship } from '../types';

export type FocusSuggestion = {
  noteId: string;
  label: string;
  reason: string;
  confidence: number;
};

export function getSuggestedFocusCandidates(notes: NoteCardModel[], relationships: Relationship[], count = 5): FocusSuggestion[] {
  const relationshipCountById = relationships.reduce<Map<string, number>>((map, relationship) => {
    map.set(relationship.fromId, (map.get(relationship.fromId) ?? 0) + 1);
    map.set(relationship.toId, (map.get(relationship.toId) ?? 0) + 1);
    return map;
  }, new Map());

  return notes
    .filter((note) => !note.archived && !note.deleted && !Boolean(note.isFocus ?? note.inFocus))
    .map((note) => {
      const recencyBoost = Math.max(0, 1 - (Date.now() - note.updatedAt) / (1000 * 60 * 60 * 24 * 14));
      const taskBoost = note.intent === 'task' && note.taskState !== 'done' ? 0.35 : 0;
      const relationBoost = Math.min(0.3, (relationshipCountById.get(note.id) ?? 0) * 0.05);
      const confidence = Number((0.42 + recencyBoost * 0.4 + taskBoost + relationBoost).toFixed(2));
      return {
        noteId: note.id,
        label: note.title ?? (note.body.slice(0, 42) || 'Untitled note'),
        reason: taskBoost > 0 ? 'Open loop with recent activity' : relationBoost > 0.12 ? 'Highly connected recent thread' : 'Recently active candidate',
        confidence
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, count);
}
