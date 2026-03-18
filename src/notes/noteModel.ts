import { normalizeOptionalTitle } from '../noteText';
import { normalizeProjectMembership } from '../projects/projectModel';
import { NoteCardModel } from '../types';

export const now = () => Date.now();

export function createNote(text: string, z: number, projectIds: string[] = []): NoteCardModel {
  const t = now();
  const trimmed = text.trim();

  return {
    id: crypto.randomUUID(),
    title: null,
    body: trimmed,
    anchors: [],
    trace: 'captured',
    x: 80 + (z % 8) * 32,
    y: 100 + (z % 6) * 28,
    z,
    createdAt: t,
    updatedAt: t,
    archived: false,
    inFocus: false,
    projectIds: normalizeProjectMembership(projectIds)
  };
}

export function normalizeNote(note: Partial<NoteCardModel>, i: number): NoteCardModel {
  return {
    id: String(note.id ?? `legacy-${i}`),
    title: normalizeOptionalTitle(typeof note.title === 'string' ? note.title : null),
    body: String(note.body ?? ''),
    anchors: Array.isArray(note.anchors) ? note.anchors.map(String) : [],
    trace: String(note.trace ?? 'idle'),
    x: Number(note.x ?? 80),
    y: Number(note.y ?? 100),
    z: Number(note.z ?? i + 1),
    createdAt: Number(note.createdAt ?? now()),
    updatedAt: Number(note.updatedAt ?? now()),
    archived: Boolean(note.archived),
    inFocus: Boolean(note.inFocus),
    projectIds: normalizeProjectMembership(note.projectIds)
  };
}
