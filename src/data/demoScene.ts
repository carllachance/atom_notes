import { refreshInferredRelationships } from '../relationshipLogic';
import { NoteCardModel, Relationship, RelationshipType, SceneState, Workspace } from '../types';
import { normalizeWorkspace } from '../workspaces/workspaceModel';
import { demoNotes, demoRelationships, demoWorkspaces, DemoNote, DemoRelationship } from './demoSeed';

const WORKSPACE_LAYOUT_COLUMNS = 3;
const WORKSPACE_X_GAP = 460;
const WORKSPACE_Y_GAP = 420;
const NOTE_X_GAP = 210;
const NOTE_Y_GAP = 170;

type DemoRelationshipMapping = {
  type: RelationshipType;
  explanation: string;
};

const RELATIONSHIP_MAPPING: Record<DemoRelationship['type'], DemoRelationshipMapping> = {
  refines: { type: 'derived_from', explanation: 'This note refines the linked idea into a sharper working direction.' },
  related_to: { type: 'related', explanation: 'These notes share a nearby concept or workflow context.' },
  blocks: { type: 'contradicts', explanation: 'This note describes a blocker or tension that must be resolved first.' },
  implements: { type: 'supports', explanation: 'This note carries the implementation work for the linked idea.' },
  part_of: { type: 'part_of', explanation: 'This note is one part of the linked larger effort.' },
  depends_on: { type: 'depends_on', explanation: 'This note depends on the linked note to move forward.' },
  impacts: { type: 'leads_to', explanation: 'Changes here materially affect the linked note.' },
  derived_from: { type: 'derived_from', explanation: 'This note is directly derived from the linked source note.' }
};

function toTimestamp(value: string) {
  return Date.parse(value);
}

function appendMetadataSections(note: DemoNote): string {
  const sections: string[] = [note.content.trim()];

  if (note.links?.length) {
    sections.push(['Links:', ...note.links.map((link) => `- ${link.label}: ${link.url}`)].join('\n'));
  }

  if (note.attachments?.length) {
    sections.push(['Attachments:', ...note.attachments.map((attachment) => `- ${attachment.name} (${attachment.kind})`)].join('\n'));
  }

  if (note.tags.length) {
    sections.push(`Tags: ${note.tags.join(', ')}`);
  }

  return sections.join('\n\n');
}

function mapIntent(note: DemoNote): NoteCardModel['intent'] {
  if (note.type === 'task' || note.type === 'process' || note.type === 'project' || note.type === 'bug') return 'task';
  if (note.type === 'code') return 'code';
  return 'note';
}

function buildWorkspaceIndex() {
  return new Map(demoWorkspaces.map((workspace, index) => [workspace.id, index]));
}

function positionNote(note: DemoNote, workspaceNoteIndex: number, workspaceIndexById: Map<string, number>) {
  const workspaceIndex = workspaceIndexById.get(note.workspaceId) ?? 0;
  const column = workspaceIndex % WORKSPACE_LAYOUT_COLUMNS;
  const row = Math.floor(workspaceIndex / WORKSPACE_LAYOUT_COLUMNS);
  const localColumn = workspaceNoteIndex % 2;
  const localRow = Math.floor(workspaceNoteIndex / 2);

  return {
    x: 120 + column * WORKSPACE_X_GAP + localColumn * NOTE_X_GAP,
    y: 120 + row * WORKSPACE_Y_GAP + localRow * NOTE_Y_GAP
  };
}

function mapDemoNote(note: DemoNote, index: number, workspaceNoteIndex: number, workspaceIndexById: Map<string, number>): NoteCardModel {
  const position = positionNote(note, workspaceNoteIndex, workspaceIndexById);
  return {
    id: note.id,
    title: note.title,
    body: appendMetadataSections(note),
    anchors: [],
    trace: note.state,
    x: position.x,
    y: position.y,
    z: index + 1,
    createdAt: toTimestamp(note.createdAt),
    updatedAt: toTimestamp(note.updatedAt),
    archived: note.state === 'archived',
    deleted: false,
    deletedAt: null,
    inFocus: note.state === 'active',
    isFocus: note.state === 'active',
    projectIds: [],
    inferredProjectIds: [],
    workspaceId: note.workspaceId,
    intent: mapIntent(note),
    intentConfidence: note.state === 'active' ? 0.78 : 0.62,
    taskState: note.type === 'task' || note.type === 'process' || note.type === 'bug' ? 'open' : undefined,
    taskSource: null,
    promotedTaskFragments: [],
    inferredRelationships: []
  };
}

function mapDemoRelationship(relationship: DemoRelationship, notesById: Set<string>): Relationship | null {
  if (!notesById.has(relationship.fromId) || !notesById.has(relationship.toId)) return null;
  const mapping = RELATIONSHIP_MAPPING[relationship.type];
  return {
    id: relationship.id,
    fromId: relationship.fromId,
    toId: relationship.toId,
    type: mapping.type,
    state: 'confirmed',
    explicitness: 'explicit',
    directional: mapping.type !== 'related' && mapping.type !== 'contradicts',
    confidence: 0.92,
    isInferred: false,
    explanation: mapping.explanation,
    heuristicSupported: true,
    createdAt: Date.now(),
    lastActiveAt: Date.now()
  };
}

export function createDemoScene(nowTs = Date.now()): SceneState {
  const workspaces: Workspace[] = demoWorkspaces
    .map((workspace, index) =>
      normalizeWorkspace(
        {
          id: workspace.id,
          key: workspace.name,
          name: workspace.name,
          color: workspace.color,
          description: `${workspace.name} synthetic demo workspace`,
          createdAt: nowTs,
          updatedAt: nowTs
        },
        index
      )
    )
    .filter((workspace): workspace is Workspace => Boolean(workspace));

  const workspaceIndexById = buildWorkspaceIndex();
  const countsByWorkspace = new Map<string, number>();
  const notes = demoNotes.map((note, index) => {
    const workspaceCount = countsByWorkspace.get(note.workspaceId) ?? 0;
    countsByWorkspace.set(note.workspaceId, workspaceCount + 1);
    return mapDemoNote(note, index, workspaceCount, workspaceIndexById);
  });

  const notesById = new Set(notes.map((note) => note.id));
  const relationships = demoRelationships
    .map((relationship) => mapDemoRelationship(relationship, notesById))
    .filter((relationship): relationship is Relationship => Boolean(relationship))
    .map((relationship) => ({ ...relationship, createdAt: nowTs, lastActiveAt: nowTs }));

  return {
    notes,
    relationships: refreshInferredRelationships(notes, relationships, nowTs),
    projects: [],
    workspaces,
    insightTimeline: [],
    isDragging: false,
    activeNoteId: null,
    quickCaptureOpen: false,
    captureComposer: { open: false, draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { state: 'hidden', mode: 'ask', query: '', response: null, transcript: [], loading: false },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}
