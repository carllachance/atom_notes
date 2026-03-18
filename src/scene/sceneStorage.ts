import { createNote, normalizeNote, now } from '../notes/noteModel';
import { refreshInferredRelationships } from '../relationshipLogic';
import { Relationship, SceneState } from '../types';

export const SCENE_KEY = 'atom-notes.scene.v3';

export function normalizeRelationship(raw: Partial<Relationship>): Relationship | null {
  if (!raw.fromId || !raw.toId) return null;

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    fromId: String(raw.fromId),
    toId: String(raw.toId),
    type: raw.type === 'references' ? 'references' : 'related_concept',
    state:
      raw.state === 'confirmed' ||
      raw.state === 'active' ||
      raw.state === 'cooling' ||
      raw.state === 'historical' ||
      raw.state === 'superseded' ||
      raw.state === 'rejected'
        ? raw.state
        : 'proposed',
    explicitness: raw.explicitness === 'explicit' ? 'explicit' : 'inferred',
    confidence: Number(raw.confidence ?? 0.5),
    reinforcementScore: Math.min(1, Math.max(0, Number(raw.reinforcementScore ?? 0.4))),
    explanation: String(raw.explanation ?? ''),
    heuristicSupported: raw.heuristicSupported !== false,
    createdAt: Number(raw.createdAt ?? now()),
    lastActiveAt: Number(raw.lastActiveAt ?? now())
  };
}

export function loadScene(): SceneState {
  const fallback: SceneState = {
    notes: [createNote('Welcome to Atom Notes\nDrag this card around.', 1)],
    relationships: [],
    activeNoteId: null,
    quickCaptureOpen: true,
    lastCtrlTapTs: 0,
    lens: 'all',
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };

  const raw =
    localStorage.getItem(SCENE_KEY) ??
    localStorage.getItem('atom-notes.scene.v2') ??
    localStorage.getItem('atom-notes.scene.v1');
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<SceneState> & { currentView?: 'canvas' | 'archive' };
    const normalizedNotes = Array.isArray(parsed.notes)
      ? parsed.notes.map((note, i) => normalizeNote(note, i))
      : fallback.notes;

    const normalizedRelationships = Array.isArray(parsed.relationships)
      ? parsed.relationships.map((item) => normalizeRelationship(item)).filter(Boolean)
      : [];

    const requestedLens =
      parsed.lens === 'focus' || parsed.lens === 'archive'
        ? parsed.lens
        : parsed.currentView === 'archive'
          ? 'archive'
          : 'all';
    const activeNoteId =
      typeof parsed.activeNoteId === 'string' && normalizedNotes.some((note) => note.id === parsed.activeNoteId)
        ? parsed.activeNoteId
        : null;

    return {
      notes: normalizedNotes,
      relationships: refreshInferredRelationships(normalizedNotes, normalizedRelationships as Relationship[], now()),
      activeNoteId,
      quickCaptureOpen: Boolean(parsed.quickCaptureOpen),
      lastCtrlTapTs: Number(parsed.lastCtrlTapTs ?? 0),
      lens: requestedLens,
      canvasScrollLeft: Number(parsed.canvasScrollLeft ?? 0),
      canvasScrollTop: Number(parsed.canvasScrollTop ?? 0)
    };
  } catch {
    return fallback;
  }
}

export function saveScene(scene: SceneState): void {
  localStorage.setItem(SCENE_KEY, JSON.stringify(scene));
}
