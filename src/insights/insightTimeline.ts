import { getCompactDisplayTitle } from '../noteText';
import { now } from '../notes/noteModel';
import { ActionSuggestion, InsightTimelineAction, InsightTimelineEntry, InsightsResponse, NoteCardModel, Project, RelationshipType, SceneState } from '../types';

const MAX_ENTRIES_PER_NOTE = 18;
const NOW_WINDOW_MS = 1000 * 60 * 60 * 18;

function truncate(value: string, maxLength = 140) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function dedupeTimelineEntries(entries: InsightTimelineEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const signature = `${entry.noteId}::${entry.kind}::${entry.title}::${entry.detail}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function capTimelineEntries(entries: InsightTimelineEntry[]) {
  const counts = new Map<string, number>();
  return entries.filter((entry) => {
    const nextCount = (counts.get(entry.noteId) ?? 0) + 1;
    counts.set(entry.noteId, nextCount);
    return nextCount <= MAX_ENTRIES_PER_NOTE;
  });
}

function makeOpenAction(note: NoteCardModel): InsightTimelineAction {
  return {
    id: `open-${note.id}`,
    label: 'Open',
    kind: 'open',
    noteId: note.id
  };
}

function makePreviewAction(id: string, label: string, suggestion: ActionSuggestion): InsightTimelineAction {
  return {
    id,
    label,
    kind: 'preview',
    suggestion
  };
}

function relationshipLabel(type: RelationshipType) {
  switch (type) {
    case 'references':
      return 'Reference';
    case 'depends_on':
      return 'Dependency';
    case 'supports':
      return 'Support';
    case 'contradicts':
      return 'Conflict';
    case 'part_of':
      return 'Structure';
    case 'leads_to':
      return 'Flow';
    case 'derived_from':
      return 'Lineage';
    default:
      return 'Related';
  }
}

function getNoteTitle(note: NoteCardModel | undefined) {
  return note ? getCompactDisplayTitle(note) : 'Untitled note';
}

export function appendInsightTimelineEntries(scene: SceneState, nextEntries: InsightTimelineEntry[]) {
  if (!nextEntries.length) return scene;
  const existing = scene.insightTimeline ?? [];
  const sorted = [...nextEntries, ...existing].sort((a, b) => b.createdAt - a.createdAt);
  return {
    ...scene,
    insightTimeline: capTimelineEntries(dedupeTimelineEntries(sorted))
  };
}

export function createRelationshipTimelineEntries(
  scene: SceneState,
  relationship: { fromId: string; toId: string; type: RelationshipType },
  options?: { createdAt?: number; title?: string; detail?: string; includeLinkBack?: boolean }
): InsightTimelineEntry[] {
  const createdAt = options?.createdAt ?? now();
  const notesById = new Map(scene.notes.map((note) => [note.id, note]));
  const source = notesById.get(relationship.fromId);
  const target = notesById.get(relationship.toId);
  if (!source || !target) return [];

  const baseDetail = options?.detail ?? `${relationshipLabel(relationship.type)} link added.`;
  const forwardLinkSuggestion: ActionSuggestion = {
    id: `timeline-link-${source.id}-${target.id}-${relationship.type}`,
    label: `Link ${getNoteTitle(source)} to ${getNoteTitle(target)}`,
    kind: 'create_link',
    relationships: [{ fromId: source.id, toId: target.id, type: relationship.type }],
    requiresConfirmation: true
  };
  const reverseLinkSuggestion: ActionSuggestion = {
    ...forwardLinkSuggestion,
    id: `timeline-link-${target.id}-${source.id}-${relationship.type}`,
    label: `Link ${getNoteTitle(target)} to ${getNoteTitle(source)}`,
    relationships: [{ fromId: target.id, toId: source.id, type: relationship.type }]
  };

  return [
    {
      id: `insight-${source.id}-${relationship.toId}-${relationship.type}-${createdAt}`,
      noteId: source.id,
      kind: 'action',
      title: options?.title ?? `Linked to ${getNoteTitle(target)}`,
      detail: baseDetail,
      createdAt,
      actions: [makeOpenAction(target)]
    },
    {
      id: `insight-${target.id}-${relationship.fromId}-${relationship.type}-${createdAt}`,
      noteId: target.id,
      kind: 'structural',
      title: `Connected with ${getNoteTitle(source)}`,
      detail: baseDetail,
      createdAt,
      actions: options?.includeLinkBack === false ? [makeOpenAction(source)] : [makeOpenAction(source), makePreviewAction(`preview-${target.id}-${source.id}-${relationship.type}`, 'Link', reverseLinkSuggestion)]
    }
  ];
}

export function createRelationshipConfirmationTimelineEntries(
  scene: SceneState,
  relationship: { fromId: string; toId: string; type: RelationshipType; explanation: string }
) {
  return createRelationshipTimelineEntries(scene, relationship, {
    title: `Confirmed ${relationshipLabel(relationship.type).toLowerCase()} connection`,
    detail: truncate(relationship.explanation || 'A proposed relationship was confirmed.'),
    includeLinkBack: false
  });
}

export function createProjectTimelineEntries(
  scene: SceneState,
  noteId: string,
  previousProjectIds: string[],
  nextProjectIds: string[],
  createdAt = now()
): InsightTimelineEntry[] {
  const added = nextProjectIds.filter((projectId) => !previousProjectIds.includes(projectId));
  const removed = previousProjectIds.filter((projectId) => !nextProjectIds.includes(projectId));
  const note = scene.notes.find((candidate) => candidate.id === noteId);
  const projectsById = new Map<string, Project>(scene.projects.map((project) => [project.id, project]));
  if (!note) return [];

  return [...added, ...removed].map((projectId) => {
    const project = projectsById.get(projectId);
    const wasAdded = added.includes(projectId);
    return {
      id: `insight-project-${noteId}-${projectId}-${wasAdded ? 'add' : 'remove'}-${createdAt}`,
      noteId,
      kind: 'action' as const,
      title: wasAdded ? `Added to ${project?.name ?? 'project'}` : `Removed from ${project?.name ?? 'project'}`,
      detail: wasAdded ? 'Project context now shapes nearby recall and ranking.' : 'Project context was intentionally reduced to keep this note focused.',
      createdAt,
      actions: []
    } satisfies InsightTimelineEntry;
  });
}

function buildAIActionPreview(noteId: string, response: InsightsResponse, topResultNoteId: string | null) {
  const linkAction = response.actions?.find((action) => action.kind === 'create_link') ?? (topResultNoteId
    ? {
        id: `timeline-ai-link-${noteId}-${topResultNoteId}`,
        label: 'Link strongest match',
        kind: 'create_link' as const,
        relationships: [{ fromId: noteId, toId: topResultNoteId, type: 'related' as const }],
        requiresConfirmation: true
      }
    : null);
  const applyAction = response.actions?.find((action) => action.kind !== 'highlight_nodes' && action.kind !== 'create_link') ?? null;

  return { linkAction, applyAction };
}

export function createAIInsightTimelineEntry(
  scene: SceneState,
  noteId: string,
  response: InsightsResponse,
  mode: 'ask' | 'explore' | 'summarize' | 'act',
  query: string,
  createdAt = now()
): InsightTimelineEntry | null {
  const note = scene.notes.find((candidate) => candidate.id === noteId);
  if (!note) return null;

  const topResult = response.results[0] ? scene.notes.find((candidate) => candidate.id === response.results[0].noteId) ?? null : null;
  const referencesCount = response.references.length;
  const { linkAction, applyAction } = buildAIActionPreview(noteId, response, topResult?.id ?? null);
  const actions: InsightTimelineAction[] = [];

  if (topResult) actions.push(makeOpenAction(topResult));
  if (linkAction) actions.push(makePreviewAction(`timeline-ai-link-${noteId}-${createdAt}`, 'Link', linkAction));
  if (applyAction) actions.push(makePreviewAction(`timeline-ai-apply-${noteId}-${createdAt}`, 'Apply', applyAction));

  const modeLabel = mode === 'explore' ? 'Exploration' : mode === 'summarize' ? 'Synthesis' : mode === 'act' ? 'Action' : 'Insight';
  const detailParts = [truncate(response.answer || 'A new graph-grounded insight is ready.')];
  if (query.trim()) detailParts.push(`Prompt: ${truncate(query.trim(), 68)}`);
  if (referencesCount > 0) detailParts.push(`${referencesCount} grounded reference${referencesCount === 1 ? '' : 's'}`);

  return {
    id: `insight-ai-${noteId}-${createdAt}`,
    noteId,
    kind: 'ai',
    title: topResult ? `${modeLabel} surfaced ${getNoteTitle(topResult)}` : `${modeLabel} updated this note`,
    detail: detailParts.join(' · '),
    createdAt,
    actions
  };
}

export function getInsightTimelineForNote(entries: InsightTimelineEntry[], noteId: string, createdAt = now()) {
  const sorted = entries
    .filter((entry) => entry.noteId === noteId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const freshEntries = sorted.filter((entry) => createdAt - entry.createdAt <= NOW_WINDOW_MS);
  const nowEntries = (freshEntries.length ? freshEntries : sorted).slice(0, 3);
  const nowEntryIds = new Set(nowEntries.map((entry) => entry.id));
  const earlierEntries = sorted.filter((entry) => !nowEntryIds.has(entry.id));

  return {
    nowEntries,
    visibleEarlierEntries: earlierEntries.slice(0, 4),
    hiddenEarlierEntries: earlierEntries.slice(4)
  };
}
