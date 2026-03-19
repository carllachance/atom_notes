import { normalizeOptionalTitle } from '../noteText';
import { normalizeProjectIds } from '../projects/projectModel';
import { normalizeAttachment } from '../attachments/attachmentModel';
import { NoteCardModel, NoteIntent, SuggestedRelationship } from '../types';

export const now = () => Date.now();

export function inferNoteTitleAndBody(text: string): Pick<NoteCardModel, 'title' | 'body'> {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstNonEmptyIndex === -1) {
    return { title: null, body: '' };
  }

  const title = lines[firstNonEmptyIndex].trim();
  const bodyLines = lines.slice(firstNonEmptyIndex + 1);
  const body = bodyLines.join('\n').trim();

  return {
    title: normalizeOptionalTitle(title),
    body
  };
}

function normalizeIntent(value: unknown): NoteIntent | undefined {
  return value === 'task' || value === 'link' || value === 'code' || value === 'note' ? value : undefined;
}

function normalizeSuggestedRelationships(value: unknown): SuggestedRelationship[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<SuggestedRelationship>;
      return {
        id: String(candidate.id ?? `suggested-${index + 1}`),
        targetId: typeof candidate.targetId === 'string' ? candidate.targetId : null,
        targetTitle: String(candidate.targetTitle ?? ''),
        type:
          candidate.type === 'references' ||
          candidate.type === 'depends_on' ||
          candidate.type === 'supports' ||
          candidate.type === 'contradicts' ||
          candidate.type === 'part_of' ||
          candidate.type === 'leads_to' ||
          candidate.type === 'derived_from'
            ? candidate.type
            : 'related',
        confidence: Number(candidate.confidence ?? 0.5),
        directional: candidate.directional !== false,
        reason: String(candidate.reason ?? ''),
        createdAt: Number(candidate.createdAt ?? now())
      } satisfies SuggestedRelationship;
    })
    .filter((value): value is SuggestedRelationship => Boolean(value));
}


function normalizeAttachments(value: unknown): NoteCardModel['attachments'] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      return normalizeAttachment(item, index);
    })
    .filter((value): value is NonNullable<NoteCardModel['attachments']>[number] => Boolean(value));
}

function normalizeTaskState(value: unknown): NoteCardModel['taskState'] {
  return value === 'done' ? 'done' : value === 'open' ? 'open' : undefined;
}

function normalizeTaskSource(value: unknown): NoteCardModel['taskSource'] {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as NonNullable<NoteCardModel['taskSource']>;
  if (typeof candidate.sourceNoteId !== 'string' || typeof candidate.text !== 'string') return null;

  return {
    sourceNoteId: candidate.sourceNoteId,
    promotionId: String(candidate.promotionId ?? crypto.randomUUID()),
    start: Number(candidate.start ?? 0),
    end: Number(candidate.end ?? Number(candidate.start ?? 0) + candidate.text.length),
    text: candidate.text,
    createdAt: Number(candidate.createdAt ?? now())
  };
}

function normalizePromotedTaskFragments(value: unknown): NoteCardModel['promotedTaskFragments'] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as NonNullable<NonNullable<NoteCardModel['promotedTaskFragments']>[number]>;
      if (typeof candidate.taskNoteId !== 'string' || typeof candidate.text !== 'string') return null;
      return {
        id: String(candidate.id ?? `promotion-${index + 1}`),
        taskNoteId: candidate.taskNoteId,
        start: Number(candidate.start ?? 0),
        end: Number(candidate.end ?? Number(candidate.start ?? 0) + candidate.text.length),
        text: candidate.text,
        createdAt: Number(candidate.createdAt ?? now())
      };
    })
    .filter((value): value is NonNullable<NoteCardModel['promotedTaskFragments']>[number] => Boolean(value));
}

export function createNote(
  text: string,
  z: number,
  projectIds: string[] = [],
  workspaceId: string | null = null,
  position?: { x: number; y: number }
): NoteCardModel {
  const t = now();
  const { title, body } = inferNoteTitleAndBody(text.trim());

  return {
    id: crypto.randomUUID(),
    title,
    body,
    anchors: [],
    trace: 'captured',
    x: position?.x ?? 80 + (z % 8) * 32,
    y: position?.y ?? 100 + (z % 6) * 28,
    z,
    createdAt: t,
    updatedAt: t,
    archived: false,
    deleted: false,
    deletedAt: null,
    inFocus: false,
    isFocus: false,
    projectIds: normalizeProjectIds(projectIds),
    inferredProjectIds: [],
    workspaceId: typeof workspaceId === 'string' && workspaceId.trim() ? workspaceId : null,
    intent: undefined,
    intentConfidence: undefined,
    taskState: undefined,
    taskSource: null,
    promotedTaskFragments: [],
    inferredRelationships: [],
    attachments: []
  };
}

export function normalizeNote(note: Partial<NoteCardModel> & { workspace?: string | null }, i: number): NoteCardModel {
  const rawWorkspaceId =
    typeof note.workspaceId === 'string'
      ? note.workspaceId
      : typeof note.workspace === 'string'
        ? note.workspace
        : null;
  const normalizedTitle = normalizeOptionalTitle(typeof note.title === 'string' ? note.title : null);
  const body = String(note.body ?? '');

  return {
    id: String(note.id ?? `legacy-${i}`),
    title: normalizedTitle,
    body,
    anchors: Array.isArray(note.anchors) ? note.anchors.map(String) : [],
    trace: String(note.trace ?? 'idle'),
    x: Number(note.x ?? 80),
    y: Number(note.y ?? 100),
    z: Number(note.z ?? i + 1),
    createdAt: Number(note.createdAt ?? now()),
    updatedAt: Number(note.updatedAt ?? now()),
    archived: Boolean(note.archived),
    deleted: Boolean((note as Partial<NoteCardModel>).deleted),
    deletedAt: typeof (note as Partial<NoteCardModel>).deletedAt === 'number' ? Number((note as Partial<NoteCardModel>).deletedAt) : null,
    inFocus: Boolean(note.inFocus ?? note.isFocus),
    isFocus: Boolean(note.isFocus ?? note.inFocus),
    projectIds: normalizeProjectIds(note.projectIds),
    inferredProjectIds: normalizeProjectIds(note.inferredProjectIds),
    workspaceId: rawWorkspaceId && rawWorkspaceId.trim() ? rawWorkspaceId : null,
    intent: normalizeIntent(note.intent),
    intentConfidence: note.intentConfidence == null ? undefined : Number(note.intentConfidence),
    taskState: normalizeTaskState(note.taskState),
    taskSource: normalizeTaskSource(note.taskSource),
    promotedTaskFragments: normalizePromotedTaskFragments(note.promotedTaskFragments),
    inferredRelationships: normalizeSuggestedRelationships(note.inferredRelationships),
    attachments: normalizeAttachments(note.attachments)
  };
}
