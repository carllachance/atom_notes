import { inferProjectMembership, inferSuggestedRelationships } from '../relationshipLogic';
import { NoteCardModel, NoteIntent, Project } from '../types';

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

export function classifyNoteIntent(note: Pick<NoteCardModel, 'title' | 'body'>): { intent: NoteIntent; confidence: number } {
  const text = normalizeText(`${note.title ?? ''}\n${note.body}`);
  if (!text) return { intent: 'note', confidence: 0.4 };
  if (/https?:\/\//.test(text)) return { intent: 'link', confidence: 0.92 };
  if (/```|const |function |class |import |export /.test(text)) return { intent: 'code', confidence: 0.88 };
  if (/^- \[.?\]|\b(todo|next|ship|fix|review|follow up)\b/m.test(text)) return { intent: 'task', confidence: 0.8 };
  return { intent: 'note', confidence: 0.7 };
}

export async function inferNoteMetadata(note: NoteCardModel, allNotes: NoteCardModel[], projects: Project[]) {
  const intent = classifyNoteIntent(note);
  const inferredProjectIds = inferProjectMembership(note, projects);
  const inferredRelationships = inferSuggestedRelationships(note, allNotes);

  return Promise.resolve({
    intent: intent.intent,
    intentConfidence: intent.confidence,
    inferredProjectIds,
    inferredRelationships
  });
}
