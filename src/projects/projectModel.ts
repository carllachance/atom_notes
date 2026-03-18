import { ProjectModel } from '../types';
import { now } from '../notes/noteModel';

const PROJECT_COLORS = ['#89a8ff', '#b18cff', '#7fd4c9', '#f0b06f', '#f08fa8', '#99b77f'];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function hashIndex(value: string, modulo: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulo;
}

export function normalizeProjectColor(color: string | null | undefined, seed = 'project') {
  if (typeof color === 'string' && /^#([0-9a-f]{6})$/i.test(color.trim())) {
    return color.trim();
  }
  return PROJECT_COLORS[hashIndex(seed, PROJECT_COLORS.length)];
}

export function normalizeProjectMembership(projectIds: unknown): string[] {
  if (!Array.isArray(projectIds)) return [];
  return [...new Set(projectIds.map(String).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function createProject(name: string, color?: string, description = ''): ProjectModel {
  const trimmedName = name.trim();
  const timestamp = now();
  const slug = slugify(trimmedName);

  return {
    id: crypto.randomUUID(),
    slug,
    name: trimmedName,
    description: description.trim(),
    color: normalizeProjectColor(color, trimmedName || slug),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function normalizeProject(project: Partial<ProjectModel>, index: number): ProjectModel {
  const fallbackName = typeof project.name === 'string' && project.name.trim() ? project.name.trim() : `Project ${index + 1}`;
  const slug = typeof project.slug === 'string' && project.slug.trim() ? project.slug.trim() : slugify(fallbackName);

  return {
    id: String(project.id ?? `project-${index + 1}`),
    slug,
    name: fallbackName,
    description: typeof project.description === 'string' ? project.description : '',
    color: normalizeProjectColor(project.color, slug),
    createdAt: Number(project.createdAt ?? now()),
    updatedAt: Number(project.updatedAt ?? now())
  };
}
