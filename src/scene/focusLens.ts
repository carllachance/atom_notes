import { getCompactDisplayTitle } from '../noteText';
import { getRankedRelationshipsForNote, getRelationshipTargetNoteId } from '../relationshipLogic';
import { NoteCardModel, Relationship, SceneState } from '../types';

const MAX_PRIMARY_NOTES = 8;
const MAX_TOTAL_SURFACED_NOTES = 16;
const MIN_PRIMARY_RADIUS = 190;
const MAX_PRIMARY_RADIUS = 320;
const MIN_ANGLE_GAP = Math.PI / 7.6;

type FocusLensSnapshot = Record<string, { x: number; y: number; z: number }>;

export type FocusLensSession = {
  rootNoteId: string;
  focusStack: string[];
  snapshot: FocusLensSnapshot;
  pinned: boolean;
};

export type FocusLensTier = 'active' | 'neighbor' | 'context' | 'background';

export type FocusLensNodeState = {
  tier: FocusLensTier;
  degree: 0 | 1 | 2 | null;
  opacityMultiplier: number;
  scaleMultiplier: number;
  zBoost: number;
};

export type FocusLensRelatedNote = {
  relationshipId: string;
  targetId: string;
  targetTitle: string;
  score: number;
  degree: 1 | 2;
  relationship: Relationship;
};

export type FocusLensPresentation = {
  active: boolean;
  activeNoteId: string | null;
  rootNoteId: string | null;
  pinned: boolean;
  focusStack: string[];
  canGoBack: boolean;
  surfacedNoteIds: string[];
  primaryNoteIds: string[];
  contextNoteIds: string[];
  overflowCount: number;
  noteStateById: Record<string, FocusLensNodeState>;
  layoutById: Record<string, { x: number; y: number }>;
  relatedNotes: FocusLensRelatedNote[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAngleBetween(anchor: NoteCardModel, target: NoteCardModel) {
  const dx = target.x - anchor.x;
  const dy = target.y - anchor.y;
  return Math.atan2(dy, dx);
}

function normalizeAngle(angle: number) {
  if (angle <= -Math.PI) return angle + Math.PI * 2;
  if (angle > Math.PI) return angle - Math.PI * 2;
  return angle;
}

function computeSettledAngles(activeNote: NoteCardModel, primaryNotes: NoteCardModel[]) {
  const sorted = [...primaryNotes]
    .map((note) => ({ note, angle: getAngleBetween(activeNote, note) }))
    .sort((a, b) => (a.angle !== b.angle ? a.angle - b.angle : a.note.id.localeCompare(b.note.id)));

  const settled = sorted.map(({ angle }) => angle);
  for (let index = 1; index < settled.length; index += 1) {
    if (settled[index] - settled[index - 1] < MIN_ANGLE_GAP) {
      settled[index] = settled[index - 1] + MIN_ANGLE_GAP;
    }
  }

  for (let index = settled.length - 2; index >= 0; index -= 1) {
    if (settled[index + 1] - settled[index] < MIN_ANGLE_GAP) {
      settled[index] = settled[index + 1] - MIN_ANGLE_GAP;
    }
  }

  return sorted.map((item, index) => ({ note: item.note, angle: normalizeAngle(settled[index]) }));
}

function buildPrimaryLayout(activeNote: NoteCardModel, primaryNotes: NoteCardModel[]) {
  const layoutById: Record<string, { x: number; y: number }> = { [activeNote.id]: { x: activeNote.x, y: activeNote.y } };
  const settledAngles = computeSettledAngles(activeNote, primaryNotes);

  settledAngles.forEach(({ note, angle }, index) => {
    const dx = note.x - activeNote.x;
    const dy = note.y - activeNote.y;
    const originalRadius = Math.hypot(dx, dy);
    const targetRadius = clamp(Math.max(originalRadius * 0.72, MIN_PRIMARY_RADIUS + index * 8), MIN_PRIMARY_RADIUS, MAX_PRIMARY_RADIUS);
    layoutById[note.id] = {
      x: activeNote.x + Math.cos(angle) * targetRadius,
      y: activeNote.y + Math.sin(angle) * Math.min(targetRadius * 0.76, MAX_PRIMARY_RADIUS - 24)
    };
  });

  return layoutById;
}

export function snapshotFocusLensPositions(scene: SceneState): FocusLensSnapshot {
  return Object.fromEntries(scene.notes.map((note) => [note.id, { x: note.x, y: note.y, z: note.z }]));
}

export function restoreFocusLensSnapshot(scene: SceneState, snapshot: FocusLensSnapshot): SceneState {
  return {
    ...scene,
    notes: scene.notes.map((note) => {
      const saved = snapshot[note.id];
      return saved ? { ...note, x: saved.x, y: saved.y, z: saved.z } : note;
    })
  };
}

export function pinFocusLensLayout(scene: SceneState, layoutById: Record<string, { x: number; y: number }>): SceneState {
  return {
    ...scene,
    notes: scene.notes.map((note) => {
      const nextPosition = layoutById[note.id];
      return nextPosition ? { ...note, x: nextPosition.x, y: nextPosition.y } : note;
    })
  };
}

export function buildFocusLensPresentation(scene: SceneState, activeNote: NoteCardModel | null, session: FocusLensSession | null): FocusLensPresentation {
  if (!activeNote || !session) {
    return {
      active: false,
      activeNoteId: activeNote?.id ?? null,
      rootNoteId: session?.rootNoteId ?? null,
      pinned: session?.pinned ?? false,
      focusStack: session?.focusStack ?? [],
      canGoBack: false,
      surfacedNoteIds: [],
      primaryNoteIds: [],
      contextNoteIds: [],
      overflowCount: 0,
      noteStateById: {},
      layoutById: {},
      relatedNotes: []
    };
  }

  const notesById = new Map(scene.notes.map((note) => [note.id, note]));
  const rankedRelationships = getRankedRelationshipsForNote(activeNote.id, scene);
  const primary: Array<FocusLensRelatedNote & { note: NoteCardModel; degree: 1 }> = [];
  for (const item of rankedRelationships.slice(0, MAX_PRIMARY_NOTES)) {
    const targetId = getRelationshipTargetNoteId(item.relationship, activeNote.id);
    const target = notesById.get(targetId);
    if (!target || target.archived || target.deleted) continue;
    primary.push({
      relationshipId: item.relationship.id,
      targetId,
      targetTitle: getCompactDisplayTitle(target, 32),
      score: item.score,
      degree: 1,
      relationship: item.relationship,
      note: target
    });
  }

  const primaryIds = primary.map((item) => item.targetId);
  const primaryIdSet = new Set(primaryIds);
  const contextCandidates: Array<FocusLensRelatedNote & { note: NoteCardModel; degree: 2 }> = [];
  const seenContextIds = new Set<string>();

  for (const item of primary) {
    const neighborRanked = getRankedRelationshipsForNote(item.targetId, scene);
    for (const candidate of neighborRanked) {
      const targetId = getRelationshipTargetNoteId(candidate.relationship, item.targetId);
      if (targetId === activeNote.id || primaryIdSet.has(targetId) || seenContextIds.has(targetId)) continue;
      const target = notesById.get(targetId);
      if (!target || target.archived || target.deleted) continue;
      seenContextIds.add(targetId);
      contextCandidates.push({
        relationshipId: candidate.relationship.id,
        targetId,
        targetTitle: getCompactDisplayTitle(target, 32),
        score: candidate.score * 0.82,
        degree: 2,
        relationship: candidate.relationship,
        note: target
      });
      if (primary.length + contextCandidates.length + 1 >= MAX_TOTAL_SURFACED_NOTES) break;
    }
    if (primary.length + contextCandidates.length + 1 >= MAX_TOTAL_SURFACED_NOTES) break;
  }

  const context = contextCandidates
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.targetTitle.localeCompare(b.targetTitle)))
    .slice(0, Math.max(0, MAX_TOTAL_SURFACED_NOTES - primary.length - 1));

  const layoutById = buildPrimaryLayout(activeNote, primary.map((item) => item.note));
  const noteStateById: Record<string, FocusLensNodeState> = {};
  noteStateById[activeNote.id] = { tier: 'active', degree: 0, opacityMultiplier: 1, scaleMultiplier: 1.05, zBoost: 600 };

  primary.forEach((item, index) => {
    noteStateById[item.targetId] = {
      tier: 'neighbor',
      degree: 1,
      opacityMultiplier: Math.max(0.76, 0.95 - index * 0.03),
      scaleMultiplier: 1.01,
      zBoost: 420 - index
    };
  });

  context.forEach((item, index) => {
    noteStateById[item.targetId] = {
      tier: 'context',
      degree: 2,
      opacityMultiplier: Math.max(0.46, 0.62 - index * 0.02),
      scaleMultiplier: 0.985,
      zBoost: 220 - index
    };
  });

  scene.notes.forEach((note) => {
    if (noteStateById[note.id]) return;
    noteStateById[note.id] = {
      tier: note.id === activeNote.id ? 'active' : 'background',
      degree: note.id === activeNote.id ? 0 : null,
      opacityMultiplier: 0.28,
      scaleMultiplier: 0.965,
      zBoost: -80
    };
  });

  return {
    active: true,
    activeNoteId: activeNote.id,
    rootNoteId: session.rootNoteId,
    pinned: session.pinned,
    focusStack: session.focusStack,
    canGoBack: session.focusStack.length > 1,
    surfacedNoteIds: [activeNote.id, ...primaryIds, ...context.map((item) => item.targetId)],
    primaryNoteIds: primaryIds,
    contextNoteIds: context.map((item) => item.targetId),
    overflowCount: Math.max(0, rankedRelationships.length - primary.length),
    noteStateById,
    layoutById,
    relatedNotes: [...primary, ...context].map(({ note: _note, ...related }) => related)
  };
}
