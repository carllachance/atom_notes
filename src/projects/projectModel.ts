import { Project } from '../types';
import { now } from '../notes/noteModel';

const PROJECT_COLORS = ['#7aa2f7', '#8f7cf7', '#5fbf97', '#d5a95b', '#e58b8b', '#73c7d9'];
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export type ProjectDraft = {
  key?: string;
  name?: string;
  color?: string;
  description?: string;
};

export function normalizeProjectIds(projectIds: unknown): string[] {
  if (!Array.isArray(projectIds)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of projectIds) {
    const id = String(value ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

function normalizeProjectKey(value: string | undefined, fallbackName: string | undefined, index: number): string {
  const source = (value ?? fallbackName ?? `project-${index + 1}`).trim();
  const normalized = source
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

  return normalized || `PROJECT-${index + 1}`;
}

function normalizeProjectName(value: string | undefined, key: string): string {
  const name = (value ?? '').trim();
  return name || key;
}

function normalizeProjectColor(value: string | undefined, index: number): string {
  const color = (value ?? '').trim();
  if (HEX_COLOR_PATTERN.test(color)) return color;
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

export function normalizeProject(raw: Partial<Project>, index: number): Project | null {
  const key = normalizeProjectKey(typeof raw.key === 'string' ? raw.key : undefined, typeof raw.name === 'string' ? raw.name : undefined, index);
  const name = normalizeProjectName(typeof raw.name === 'string' ? raw.name : undefined, key);
  const t = now();

  return {
    id: String(raw.id ?? `project-${index + 1}`),
    key,
    name,
    color: normalizeProjectColor(typeof raw.color === 'string' ? raw.color : undefined, index),
    description: String(raw.description ?? '').trim(),
    createdAt: Number(raw.createdAt ?? t),
    updatedAt: Number(raw.updatedAt ?? t)
  };
}

export function createProject(draft: ProjectDraft, index: number): Project {
  const key = normalizeProjectKey(draft.key, draft.name, index);
  const name = normalizeProjectName(draft.name, key);
  const t = now();

  return {
    id: crypto.randomUUID(),
    key,
    name,
    color: normalizeProjectColor(draft.color, index),
    description: String(draft.description ?? '').trim(),
    createdAt: t,
    updatedAt: t
  };
}
