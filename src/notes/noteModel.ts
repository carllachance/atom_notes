import { normalizeOptionalTitle } from '../noteText';
import { NoteCardModel } from '../types';

export const now = () => Date.now();

function normalizeTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeTag(value)).filter((value): value is string => Boolean(value)))];
}

export function createNote(text: string, z: number): NoteCardModel {
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
    workspaceId: null,
    workspaceAffinities: [],
    projectIds: []
  };
}

export function normalizeNote(note: Partial<NoteCardModel> & { workspace?: unknown; projects?: unknown }, i: number): NoteCardModel {
  const workspaceId = normalizeTag(note.workspaceId ?? note.workspace);
  const workspaceAffinities = normalizeStringList(note.workspaceAffinities);
  const projectIds = normalizeStringList(note.projectIds ?? note.projects);

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
    workspaceId,
    workspaceAffinities,
    projectIds
  };
}
