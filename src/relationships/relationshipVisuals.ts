import { getRelationshipTargetNoteId } from '../relationshipLogic';
import { NoteCardModel, Relationship, RelationshipType } from '../types';

export type RelationshipVisualKind = 'direct' | 'inferred' | 'project';
export type RelationshipInteractionState = 'default' | 'emphasized' | 'muted';

export type RelationshipEdgePresentation = {
  kind: Exclude<RelationshipVisualKind, 'project'>;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  strokeDasharray?: string;
  motionClassName: string;
  nodeBorderOpacity: number;
  nodeHaloOpacity: number;
};

export type ProjectGroupPresentation = {
  kind: 'project';
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  strokeDasharray: string;
  labelOpacity: number;
};

export type ProjectGroup = {
  id: string;
  label: string;
  noteIds: string[];
  bounds: { x: number; y: number; width: number; height: number };
};

const NOTE_CARD_WIDTH = 270;
const NOTE_CARD_HEIGHT = 124;
const MAX_PROJECT_GROUPS = 3;
const PROJECT_ANCHOR_PREFIXES = ['#project/', '#project:', 'project/', 'project:'];

const RELATIONSHIP_TYPE_COLORS: Record<RelationshipType, string> = {
  related_concept: '113, 162, 255',
  references: '177, 132, 255'
};

/**
 * Relationship visual legend.
 *
 * direct   → semantic edge, solid, heavier, calmer but more legible at rest.
 * inferred → semantic edge, dashed, lighter, slightly breathing to signal context rather than fact.
 * project  → no extra semantic spaghetti; render a neutral grouping field behind member notes.
 *
 * Hover/selection may amplify opacity, but category encodings must remain stable.
 */
export const RELATIONSHIP_VISUAL_TOKENS = {
  direct: {
    strokeWidth: 2.25,
    minOpacity: 0.28,
    maxOpacity: 0.5,
    nodeBorderOpacity: 0.34,
    nodeHaloOpacity: 0.2,
    motionClassName: 'relationship-edge--steady'
  },
  inferred: {
    strokeWidth: 1.45,
    minOpacity: 0.14,
    maxOpacity: 0.34,
    strokeDasharray: '5 10',
    nodeBorderOpacity: 0.24,
    nodeHaloOpacity: 0.12,
    motionClassName: 'relationship-edge--inferred'
  },
  project: {
    stroke: 'rgba(205, 214, 238, 0.24)',
    fill: 'rgba(111, 130, 171, 0.07)',
    strokeWidth: 1,
    strokeDasharray: '10 16',
    fillOpacity: 1,
    strokeOpacity: 1,
    labelOpacity: 0.68
  }
} as const satisfies Record<RelationshipVisualKind, Record<string, number | string>>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function withAlpha(rgb: string, alpha: number) {
  return `rgba(${rgb}, ${alpha})`;
}

function getBaseStroke(relationshipType: RelationshipType, kind: Exclude<RelationshipVisualKind, 'project'>) {
  const rgb = RELATIONSHIP_TYPE_COLORS[relationshipType];
  return withAlpha(rgb, kind === 'direct' ? 0.78 : 0.54);
}

export function getRelationshipVisualKind(relationship: Relationship): Exclude<RelationshipVisualKind, 'project'> {
  return relationship.explicitness === 'explicit' ? 'direct' : 'inferred';
}

export function getRelationshipEdgePresentation(
  relationship: Relationship,
  options: { score: number; interactionState?: RelationshipInteractionState }
): RelationshipEdgePresentation {
  const kind = getRelationshipVisualKind(relationship);
  const token = RELATIONSHIP_VISUAL_TOKENS[kind];
  const interactionState = options.interactionState ?? 'default';
  const normalizedScore = clamp(options.score, 0, 1.2);
  const baseOpacity = clamp(
    token.minOpacity + normalizedScore * (token.maxOpacity - token.minOpacity),
    token.minOpacity,
    token.maxOpacity
  );
  const interactionMultiplier =
    interactionState === 'emphasized' ? 1.18 : interactionState === 'muted' ? 0.72 : 1;
  const widthMultiplier = interactionState === 'emphasized' ? 1.08 : 1;

  return {
    kind,
    stroke: getBaseStroke(relationship.type, kind),
    strokeOpacity: clamp(baseOpacity * interactionMultiplier, 0.08, 0.62),
    strokeWidth: Number((token.strokeWidth * widthMultiplier).toFixed(2)),
    strokeDasharray: 'strokeDasharray' in token ? String(token.strokeDasharray) : undefined,
    motionClassName: String(token.motionClassName),
    nodeBorderOpacity: clamp(Number(token.nodeBorderOpacity) * interactionMultiplier, 0.16, 0.44),
    nodeHaloOpacity: clamp(Number(token.nodeHaloOpacity) * interactionMultiplier, 0.08, 0.28)
  };
}

export function getProjectGroupPresentation(interactionState: RelationshipInteractionState = 'default'): ProjectGroupPresentation {
  const token = RELATIONSHIP_VISUAL_TOKENS.project;
  const interactionMultiplier = interactionState === 'emphasized' ? 1.16 : interactionState === 'muted' ? 0.82 : 1;

  return {
    kind: 'project',
    fill: String(token.fill),
    fillOpacity: clamp(Number(token.fillOpacity) * interactionMultiplier, 0.04, 0.12),
    stroke: String(token.stroke),
    strokeOpacity: clamp(Number(token.strokeOpacity) * interactionMultiplier, 0.12, 0.32),
    strokeWidth: Number(token.strokeWidth),
    strokeDasharray: String(token.strokeDasharray),
    labelOpacity: clamp(Number(token.labelOpacity) * interactionMultiplier, 0.42, 0.84)
  };
}

function normalizeProjectAnchor(anchor: string) {
  const normalized = anchor.trim().toLowerCase();
  const prefix = PROJECT_ANCHOR_PREFIXES.find((candidate) => normalized.startsWith(candidate));
  if (!prefix) return null;

  const label = anchor.trim().slice(prefix.length).trim();
  if (!label) return null;

  return label.replace(/^[-_/]+/, '');
}

export function getProjectTokens(note: NoteCardModel) {
  return Array.from(new Set(note.anchors.map(normalizeProjectAnchor).filter((token): token is string => Boolean(token))));
}

export function getRelationshipProjectTokens(activeNote: NoteCardModel, targetNote: NoteCardModel) {
  const activeProjects = new Set(getProjectTokens(activeNote));
  return getProjectTokens(targetNote).filter((token) => activeProjects.has(token));
}

export function buildProjectGroups(
  activeNote: NoteCardModel,
  visibleRelationships: Array<{ relationship: Relationship; target: NoteCardModel }>
): ProjectGroup[] {
  const groups = new Map<string, Set<string>>();

  visibleRelationships.forEach(({ target }) => {
    getRelationshipProjectTokens(activeNote, target).forEach((token) => {
      const members = groups.get(token) ?? new Set<string>([activeNote.id]);
      members.add(target.id);
      groups.set(token, members);
    });
  });

  return Array.from(groups.entries())
    .map(([token, noteIds]) => {
      const members = [activeNote, ...visibleRelationships.map(({ target }) => target)].filter((note, index, list) => {
        const firstMatch = list.findIndex((candidate) => candidate.id === note.id);
        return firstMatch === index && noteIds.has(note.id);
      });
      const xs = members.map((note) => note.x);
      const ys = members.map((note) => note.y);
      const rightEdges = members.map((note) => note.x + NOTE_CARD_WIDTH);
      const bottomEdges = members.map((note) => note.y + NOTE_CARD_HEIGHT);
      const paddingX = 58;
      const paddingY = 44;

      return {
        id: `project:${token}`,
        label: token,
        noteIds: Array.from(noteIds),
        bounds: {
          x: Math.min(...xs) - paddingX,
          y: Math.min(...ys) - paddingY,
          width: Math.max(...rightEdges) - Math.min(...xs) + paddingX * 2,
          height: Math.max(...bottomEdges) - Math.min(...ys) + paddingY * 2
        }
      } satisfies ProjectGroup;
    })
    .filter((group) => group.noteIds.length > 1)
    .sort((a, b) => {
      if (b.noteIds.length !== a.noteIds.length) return b.noteIds.length - a.noteIds.length;
      return a.label.localeCompare(b.label);
    })
    .slice(0, MAX_PROJECT_GROUPS);
}

export function getProjectMembershipForRelationship(activeNote: NoteCardModel, targetNote: NoteCardModel) {
  return getRelationshipProjectTokens(activeNote, targetNote).length > 0;
}

export function buildVisibleRelationshipProjectMap(
  activeNote: NoteCardModel,
  relationships: Array<{ relationship: Relationship; target: NoteCardModel }>
) {
  return new Map(
    relationships.map(({ relationship, target }) => [relationship.id, getProjectMembershipForRelationship(activeNote, target)])
  );
}

export function getRelationshipTargetIdForVisual(relationship: Relationship, activeNoteId: string) {
  return getRelationshipTargetNoteId(relationship, activeNoteId);
}
