import test from 'node:test';
import assert from 'node:assert/strict';
import { NoteCardModel } from '../types';
import { resolveShelfSize } from '../components/shelfSizing';

const now = Date.now();

function makeNote(overrides: Partial<NoteCardModel> = {}): NoteCardModel {
  return {
    id: 'n-1',
    title: 'Note',
    body: 'Short note',
    anchors: [],
    trace: 'captured',
    x: 0,
    y: 0,
    z: 1,
    createdAt: now,
    updatedAt: now,
    archived: false,
    deleted: false,
    deletedAt: null,
    projectIds: [],
    workspaceId: null,
    ...overrides
  };
}

test('downgrades auto hero notes when content is too sparse', () => {
  const note = makeNote({ body: 'tiny' });
  const resolved = resolveShelfSize(note, 'hero', 0);
  assert.equal(resolved.shelfSize, 'featured');
  assert.equal(resolved.didDowngrade, true);
});

test('keeps explicit user-featured size even if sparse', () => {
  const note = makeNote({ body: 'tiny', shelfSize: 'hero' });
  const resolved = resolveShelfSize(note, 'standard', 0);
  assert.equal(resolved.shelfSize, 'hero');
  assert.equal(resolved.isPinnedLarge, true);
});

test('allows featured size when content is rich enough', () => {
  const note = makeNote({
    body: 'Decision: finalize rollout sequence.\nOpen question: should migration happen this sprint?\nFollow-up: verify staging data and execute cutover.',
    projectIds: ['p1'],
    workspaceId: 'w1',
    inferredRelationships: [
      {
        id: 'r1',
        targetId: 'n2',
        targetTitle: 'Ref',
        type: 'related',
        confidence: 0.8,
        directional: false,
        reason: 'semantic overlap',
        createdAt: now
      }
    ]
  });
  const resolved = resolveShelfSize(note, 'featured', 3);
  assert.equal(resolved.shelfSize, 'featured');
  assert.equal(resolved.didDowngrade, false);
});
