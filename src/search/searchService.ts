import { getProjectsForNote } from '../projects/projectSelectors';
import { getWorkspaceIdsForNote } from '../workspaces/workspaceSelectors';
import { SceneState } from '../types';

export type SearchHit = {
  noteId: string;
  score: number;
  excerpts: string[];
};

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildSearchCorpus(scene: SceneState, noteId: string): string[] {
  const note = scene.notes.find((candidate) => candidate.id === noteId);
  if (!note) return [];

  const workspaceLabels = getWorkspaceIdsForNote(note)
    .map((workspaceId) => scene.workspaces.find((workspace) => workspace.id === workspaceId))
    .filter(Boolean)
    .flatMap((workspace) => [workspace!.name, workspace!.key, workspace!.description]);
  const projectLabels = getProjectsForNote(scene, noteId).flatMap((project) => [project.name, project.key, project.description]);
  const attachments = (note.attachments ?? []).flatMap((attachment) => [
    attachment.name,
    attachment.mimeType,
    attachment.extraction?.text ?? ''
  ]);
  const provenance = note.provenance?.externalReferences.flatMap((reference) => [
    reference.label,
    reference.value,
    reference.breakDetail ?? ''
  ]) ?? [];
  const library = (scene.libraryItems ?? [])
    .filter((item) => item.workspaceIds.some((workspaceId) => getWorkspaceIdsForNote(note).includes(workspaceId)) || item.projectIds.some((projectId) => note.projectIds.includes(projectId)))
    .flatMap((item) => [item.label, item.text]);

  return [
    note.title ?? '',
    note.body,
    note.intent ?? '',
    note.trace,
    note.taskState ?? '',
    note.verificationReason ?? '',
    ...workspaceLabels,
    ...projectLabels,
    ...attachments,
    ...provenance,
    ...library
  ];
}

export function querySearchIndex(scene: SceneState, query: string): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  return scene.notes
    .filter((note) => !note.archived && !note.deleted)
    .map((note) => {
      const corpus = buildSearchCorpus(scene, note.id);
      let score = 0;
      const excerpts: string[] = [];

      for (const token of tokens) {
        for (const surface of corpus) {
          const normalized = surface.toLowerCase();
          if (!normalized.includes(token)) continue;
          score += surface === note.title ? 4 : surface === note.body ? 2.5 : 1;
          if (excerpts.length < 3) excerpts.push(surface.slice(0, 140));
        }
      }

      return { noteId: note.id, score, excerpts };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score);
}
