import { Note } from '../models/note';
import { WorkspaceState } from '../models/workspace';

const NOTES_KEY = 'clarify.notes.v1';
const WORKSPACE_KEY = 'clarify.workspace.v1';

export const persistenceService = {
  loadNotes(): Note[] {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  },
  saveNotes(notes: Note[]) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  },
  loadWorkspace(): WorkspaceState | null {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceState) : null;
  },
  saveWorkspace(workspace: WorkspaceState) {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  },
};
