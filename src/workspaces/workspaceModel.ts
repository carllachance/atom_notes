import { Workspace } from '../types';
import { now } from '../notes/noteModel';

const WORKSPACE_COLORS = ['#7aa2f7', '#8f7cf7', '#5fbf97', '#d5a95b', '#e58b8b', '#73c7d9'];
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export type WorkspaceDraft = {
  key?: string;
  name?: string;
  color?: string;
  description?: string;
};

function normalizeWorkspaceKey(value: string | undefined, fallbackName: string | undefined, index: number): string {
  const source = (value ?? fallbackName ?? `workspace-${index + 1}`).trim();
  const normalized = source
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

  return normalized || `WORKSPACE-${index + 1}`;
}

function normalizeWorkspaceName(value: string | undefined, key: string): string {
  const name = (value ?? '').trim();
  return name || key;
}

function normalizeWorkspaceColor(value: string | undefined, index: number): string {
  const color = (value ?? '').trim();
  if (HEX_COLOR_PATTERN.test(color)) return color;
  return WORKSPACE_COLORS[index % WORKSPACE_COLORS.length];
}

export function normalizeWorkspace(raw: Partial<Workspace>, index: number): Workspace | null {
  const key = normalizeWorkspaceKey(
    typeof raw.key === 'string' ? raw.key : undefined,
    typeof raw.name === 'string' ? raw.name : undefined,
    index
  );
  const name = normalizeWorkspaceName(typeof raw.name === 'string' ? raw.name : undefined, key);
  const t = now();

  return {
    id: String(raw.id ?? `workspace-${index + 1}`),
    key,
    name,
    color: normalizeWorkspaceColor(typeof raw.color === 'string' ? raw.color : undefined, index),
    description: String(raw.description ?? '').trim(),
    createdAt: Number(raw.createdAt ?? t),
    updatedAt: Number(raw.updatedAt ?? t)
  };
}

export function createWorkspace(draft: WorkspaceDraft, index: number): Workspace {
  const key = normalizeWorkspaceKey(draft.key, draft.name, index);
  const name = normalizeWorkspaceName(draft.name, key);
  const t = now();

  return {
    id: crypto.randomUUID(),
    key,
    name,
    color: normalizeWorkspaceColor(draft.color, index),
    description: String(draft.description ?? '').trim(),
    createdAt: t,
    updatedAt: t
  };
}
