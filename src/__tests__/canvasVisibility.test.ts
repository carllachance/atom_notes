import { describe, expect, it } from 'vitest';
import { getCanvasVisualState, getDefaultPrimaryNoteIds } from '../canvas/visibility';
import { NoteCardModel, Relationship } from '../types';

function makeNote(id: string, updatedAt: number, overrides: Partial<NoteCardModel> = {}): NoteCardModel {
  return {
    id,
    title: id,
    body: `${id} body`,
    anchors: [],
    trace: 'idle',
    x: 0,
    y: 0,
    z: 1,
    createdAt: updatedAt,
    updatedAt,
    archived: false,
    inFocus: false,
    ...overrides
  };
}

function makeRelationship(fromId: string, toId: string, overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: `${fromId}-${toId}`,
    fromId,
    toId,
    type: 'related_concept',
    state: 'confirmed',
    explicitness: 'explicit',
    confidence: 0.9,
    explanation: 'linked',
    heuristicSupported: true,
    createdAt: 100,
    lastActiveAt: 100,
    ...overrides
  };
}

describe('canvas visibility staging', () => {
  it('keeps strongest notes primary at rest and mutes lower-signal notes', () => {
    const nowTs = 1_000;
    const notes = [
      makeNote('high', 990, { inFocus: true }),
      makeNote('support', 980),
      makeNote('signal-3', 975),
      makeNote('signal-4', 970),
      makeNote('signal-5', 965),
      makeNote('signal-6', 960),
      makeNote('quiet', 100)
    ];
    const relationships = [
      makeRelationship('high', 'support'),
      makeRelationship('high', 'signal-3'),
      makeRelationship('support', 'signal-4'),
      makeRelationship('signal-5', 'signal-6')
    ];
    const primaryIds = new Set(getDefaultPrimaryNoteIds(notes, relationships, nowTs));

    expect(primaryIds.has('high')).toBe(true);

    const quietState = getCanvasVisualState(notes[6], primaryIds, {
      activeNoteId: null,
      hoveredNoteId: null,
      draggingNoteId: null,
      revealMatchedNoteIds: [],
      revealActiveNoteId: null,
      relatedHoverNoteIds: [],
      selectedContextNoteIds: []
    });

    expect(quietState.stage).toBe('rest-muted');
    expect(quietState.showSummary).toBe(false);
  });

  it('promotes hover, selection, drag, and reveal states progressively', () => {
    const note = makeNote('n1', 990);
    const primaryIds = new Set<string>();

    expect(
      getCanvasVisualState(note, primaryIds, {
        activeNoteId: null,
        hoveredNoteId: 'n1',
        draggingNoteId: null,
        revealMatchedNoteIds: [],
        revealActiveNoteId: null,
        relatedHoverNoteIds: [],
        selectedContextNoteIds: []
      }).stage
    ).toBe('hover-focus');

    expect(
      getCanvasVisualState(note, primaryIds, {
        activeNoteId: 'n1',
        hoveredNoteId: null,
        draggingNoteId: null,
        revealMatchedNoteIds: [],
        revealActiveNoteId: null,
        relatedHoverNoteIds: [],
        selectedContextNoteIds: []
      }).stage
    ).toBe('selection-focus');

    expect(
      getCanvasVisualState(note, primaryIds, {
        activeNoteId: null,
        hoveredNoteId: null,
        draggingNoteId: 'n1',
        revealMatchedNoteIds: [],
        revealActiveNoteId: null,
        relatedHoverNoteIds: [],
        selectedContextNoteIds: []
      }).stage
    ).toBe('drag-focus');

    const revealState = getCanvasVisualState(note, primaryIds, {
      activeNoteId: null,
      hoveredNoteId: null,
      draggingNoteId: null,
      revealMatchedNoteIds: ['n1'],
      revealActiveNoteId: 'n1',
      relatedHoverNoteIds: [],
      selectedContextNoteIds: []
    });

    expect(revealState.stage).toBe('reveal-focus');
    expect(revealState.showTrace).toBe(true);
  });
});
