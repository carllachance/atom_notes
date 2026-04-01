import { inferProjectMembership, inferSuggestedRelationships } from '../relationshipLogic';
import { NoteCardModel, NoteIntent, Project, Workspace } from '../types';

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

function inferWorkspaceMembership(note: NoteCardModel, workspaces: Workspace[]) {
  const text = `${note.title ?? ''}\n${note.body}`.toLowerCase();
  return workspaces
    .filter((workspace) => text.includes(workspace.name.toLowerCase()) || text.includes(workspace.key.toLowerCase()))
    .map((workspace) => workspace.id);
}

export async function inferNoteMetadata(note: NoteCardModel, allNotes: NoteCardModel[], projects: Project[], workspaces: Workspace[] = []) {
  const intent = classifyNoteIntent(note);
  const inferredProjectIds = inferProjectMembership(note, projects);
  const inferredWorkspaceIds = inferWorkspaceMembership(note, workspaces);
  const inferredRelationships = inferSuggestedRelationships(note, allNotes);

  return Promise.resolve({
    intent: intent.intent,
    intentConfidence: intent.confidence,
    inferredProjectIds,
    inferredWorkspaceIds,
    projectSuggestions: inferredProjectIds.map((groupId, index) => ({
      id: `project-suggestion-${note.id}-${groupId}`,
      groupId,
      confidence: Math.max(0.61, intent.confidence - index * 0.05),
      explanation: 'Mentioned in the note text and nearby context.',
      createdAt: Date.now()
    })),
    workspaceSuggestions: inferredWorkspaceIds.map((groupId, index) => ({
      id: `workspace-suggestion-${note.id}-${groupId}`,
      groupId,
      confidence: Math.max(0.66, intent.confidence - index * 0.04),
      explanation: 'Likely workspace fit based on note language.',
      createdAt: Date.now()
    })),
    inferredRelationships
  });
}
