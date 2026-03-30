import { StudyInteraction, StudySupportBlock } from './studyModel';

export function selectStudyBlocksForNote(blocksByNoteId: Record<string, StudySupportBlock[]> | undefined, noteId: string | null): StudySupportBlock[] {
  if (!noteId) return [];
  return blocksByNoteId?.[noteId] ?? [];
}

export function selectStudyInteractionsForNote(interactionsByNoteId: Record<string, StudyInteraction[]> | undefined, noteId: string | null): StudyInteraction[] {
  if (!noteId) return [];
  return interactionsByNoteId?.[noteId] ?? [];
}

export function upsertStudyBlockForNote(blocksByNoteId: Record<string, StudySupportBlock[]> | undefined, noteId: string, block: StudySupportBlock) {
  return {
    ...(blocksByNoteId ?? {}),
    [noteId]: [
      block,
      ...(((blocksByNoteId ?? {})[noteId] ?? []).filter((existing) => existing.interactionType !== block.interactionType))
    ]
  };
}

export function upsertStudyInteractionForNote(interactionsByNoteId: Record<string, StudyInteraction[]> | undefined, noteId: string, interaction: StudyInteraction) {
  return {
    ...(interactionsByNoteId ?? {}),
    [noteId]: [interaction, ...((interactionsByNoteId ?? {})[noteId] ?? [])]
  };
}

export function removeStudyBlockForNote(blocksByNoteId: Record<string, StudySupportBlock[]> | undefined, noteId: string, blockId: string) {
  return {
    ...(blocksByNoteId ?? {}),
    [noteId]: ((blocksByNoteId ?? {})[noteId] ?? []).filter((block) => block.id !== blockId)
  };
}
