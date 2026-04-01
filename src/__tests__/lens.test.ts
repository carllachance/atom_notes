import test from 'node:test';
import assert from 'node:assert/strict';
import { getLensPresentation } from '../scene/lens';
import { SceneState } from '../types';

function makeScene(): SceneState {
  return {
    notes: [
      { id: 'a', title: 'Alpha', body: 'Launch brief policy', anchors: [], trace: 'idle', x: 0, y: 0, z: 1, createdAt: 0, updatedAt: 0, archived: false, deleted: false, deletedAt: null, inFocus: true, isFocus: true, projectIds: ['p1'], inferredProjectIds: [], workspaceId: 'w1', inferredRelationships: [] },
      { id: 'b', title: 'Beta', body: 'Cross-team policy mirror', anchors: [], trace: 'idle', x: 0, y: 0, z: 2, createdAt: 0, updatedAt: 0, archived: false, deleted: false, deletedAt: null, inFocus: false, isFocus: false, projectIds: ['p2'], inferredProjectIds: [], workspaceId: 'w2', inferredRelationships: [], attachments: [{ id: 'att-1', name: 'mirror.pdf', mimeType: 'application/pdf', fileSize: 120, addedAt: 0, fileKind: 'pdf', rawFile: { dataUrl: 'data:application/pdf;base64,AA==', contentHash: 'hash-1', lastModified: 0 }, processing: { status: 'processed', error: null, retryCount: 0, updatedAt: 0 }, extraction: null }] },
      { id: 'c', title: 'Gamma', body: 'Project-only execution note', anchors: [], trace: 'idle', x: 0, y: 0, z: 3, createdAt: 0, updatedAt: 0, archived: false, deleted: false, deletedAt: null, inFocus: false, isFocus: false, projectIds: ['p1'], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] },
      { id: 'd', title: 'Delta', body: 'Loose idea with no affinities', anchors: [], trace: 'idle', x: 0, y: 0, z: 4, createdAt: 0, updatedAt: 0, archived: false, deleted: false, deletedAt: null, inFocus: false, isFocus: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] },
      { id: 'e', title: 'Echo', body: 'Archived', anchors: [], trace: 'idle', x: 0, y: 0, z: 5, createdAt: 0, updatedAt: 0, archived: true, deleted: false, deletedAt: null, inFocus: false, isFocus: false, projectIds: [], inferredProjectIds: [], workspaceId: null, inferredRelationships: [] }
    ],
    relationships: [
      { id: 'r1', fromId: 'a', toId: 'b', type: 'references', state: 'confirmed', explicitness: 'explicit', directional: true, confidence: 0.9, isInferred: false, explanation: 'Shared source', heuristicSupported: true, createdAt: 1, lastActiveAt: 1 },
      { id: 'r2', fromId: 'a', toId: 'c', type: 'related', state: 'confirmed', explicitness: 'explicit', directional: false, confidence: 0.9, isInferred: false, explanation: 'Same project thread', heuristicSupported: true, createdAt: 1, lastActiveAt: 1 }
    ],
    projects: [
      { id: 'p1', key: 'SLD', name: 'Ship Launch', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 },
      { id: 'p2', key: 'OPS', name: 'Operations', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }
    ],
    workspaces: [
      { id: 'w1', key: 'LAB', name: 'Lab', color: '#7aa2f7', description: '', createdAt: 1, updatedAt: 1 },
      { id: 'w2', key: 'FIELD', name: 'Field', color: '#5fbf97', description: '', createdAt: 1, updatedAt: 1 }
    ],
    isDragging: false,
    activeNoteId: null,
    expandedSecondarySurface: 'none',
    captureComposer: { draft: '', lastCreatedNoteId: null },
    focusMode: { highlight: true, isolate: false },
    aiPanel: { mode: 'ask', query: '', response: null, transcript: [], loading: false, communicationState: 'idle', interactionMode: 'live-stream' },
    lastCtrlTapTs: 0,
    lens: { kind: 'universe' },
    canvasScrollLeft: 0,
    canvasScrollTop: 0
  };
}

test('project lens keeps members primary and related off-project notes as supporting context', () => {
  const scene = { ...makeScene(), lens: { kind: 'project', projectId: 'p1', mode: 'context' } as const };
  const presentation = getLensPresentation(scene);
  assert.deepEqual(presentation.visibleNotes.map((note) => note.id), ['a', 'b', 'c']);
  assert.equal(presentation.noteMetaById.a.emphasis, 'primary');
  assert.equal(presentation.noteMetaById.c.emphasis, 'primary');
  assert.equal(presentation.noteMetaById.b.emphasis, 'supporting');
  assert.equal(presentation.noteMetaById.b.projectState, 'supporting');
});

test('workspace lens acts as scope rather than prison and marks surfaced cross-workspace notes', () => {
  const scene = { ...makeScene(), lens: { kind: 'workspace', workspaceId: 'w1', mode: 'context' } as const };
  const presentation = getLensPresentation(scene);
  assert.deepEqual(presentation.visibleNotes.map((note) => note.id), ['a', 'b', 'c']);
  assert.equal(presentation.noteMetaById.a.workspaceState, 'member');
  assert.equal(presentation.noteMetaById.b.workspaceState, 'supporting');
  assert.equal(presentation.noteMetaById.b.surfaced, true);
  assert.equal(presentation.noteMetaById.c.workspaceState, 'orphan');
});

test('reveal lens surfaces matches plus their relationship context across scopes', () => {
  const scene = { ...makeScene(), lens: { kind: 'reveal', query: 'policy', workspaceId: 'w1', projectId: null, mode: 'context' } as const };
  const presentation = getLensPresentation(scene);
  assert.deepEqual(presentation.revealMatchIds, ['a']);
  assert.deepEqual(presentation.visibleNotes.map((note) => note.id), ['a', 'b', 'c']);
  assert.equal(presentation.noteMetaById.a.revealed, true);
  assert.equal(presentation.noteMetaById.b.surfaced, true);
});

test('notes with no project or workspace affinity still appear in the shared universe and reveal matches', () => {
  const universe = getLensPresentation(makeScene());
  assert.equal(universe.visibleNotes.some((note) => note.id === 'd'), true);
  const reveal = getLensPresentation({ ...makeScene(), lens: { kind: 'reveal', query: 'loose idea', workspaceId: null, projectId: null, mode: 'strict' } });
  assert.deepEqual(reveal.visibleNotes.map((note) => note.id), ['d']);
  assert.equal(reveal.noteMetaById.d.workspaceState, 'orphan');
});

test('library lens narrows to notes with source material', () => {
  const scene = makeScene();
  scene.notes = scene.notes.map((note) => note.id === 'c'
    ? {
        ...note,
        provenance: {
          origin: 'manual',
          createdAt: 0,
          updatedAt: 0,
          externalReferences: [{
            id: 'ref-1',
            kind: 'url',
            label: 'Spec',
            value: 'https://example.com/spec',
            confidence: 0.9,
            isInferred: false,
            createdAt: 0
          }]
        }
      }
    : note);
  const presentation = getLensPresentation({ ...scene, lens: { kind: 'library' } });
  assert.deepEqual(presentation.visibleNotes.map((note) => note.id), ['b', 'c']);
  assert.equal(presentation.lensLabel, 'Library lens');
});
