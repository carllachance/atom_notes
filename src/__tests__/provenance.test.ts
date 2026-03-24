import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateExternalReferenceHealth,
  getNotesWithOrphanedEvidence,
  getNotesWithUnverifiedConclusions,
  getTasksDerivedFromMissingSources,
  relinkExternalReference,
  summarizeNoteSourceHealth
} from '../notes/provenance';
import { NoteCardModel } from '../types';

function makeNote(overrides: Partial<NoteCardModel> = {}): NoteCardModel {
  return {
    id: 'n-1',
    title: 'Note',
    body: 'Body',
    anchors: [],
    trace: 'idle',
    x: 0,
    y: 0,
    z: 1,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    deleted: false,
    deletedAt: null,
    projectIds: [],
    workspaceId: null,
    verificationState: 'verified',
    ...overrides
  };
}

test('evaluateExternalReferenceHealth classifies break types and statuses', () => {
  const accessBroken = evaluateExternalReferenceHealth({
    id: 'r1',
    kind: 'url',
    label: 'Ref',
    value: 'https://example.com',
    confidence: 0.9,
    isInferred: false,
    accessStatus: 'missing',
    identityStatus: 'verified',
    meaningStatus: 'aligned',
    createdAt: 1
  });
  assert.equal(accessBroken.sourceHealth, 'orphaned');
  assert.equal(accessBroken.breakType, 'access_break');

  const meaningBroken = evaluateExternalReferenceHealth({
    ...accessBroken,
    id: 'r2',
    accessStatus: 'reachable',
    identityStatus: 'verified',
    meaningStatus: 'drifted'
  });
  assert.equal(meaningBroken.sourceHealth, 'uncertain');
  assert.equal(meaningBroken.breakType, 'meaning_break');
});

test('relinkExternalReference regrounds previously orphaned source', (t: any) => {
  t.mock.method(Date, 'now', () => 42);
  const note = makeNote({
    provenance: {
      origin: 'manual',
      createdAt: 1,
      updatedAt: 1,
      externalReferences: [{
        id: 'ref-1',
        kind: 'url',
        label: 'Broken',
        value: 'https://old',
        confidence: 0.8,
        isInferred: false,
        accessStatus: 'missing',
        identityStatus: 'unknown',
        meaningStatus: 'unknown',
        sourceHealth: 'orphaned',
        createdAt: 1
      }]
    }
  });

  const relinked = relinkExternalReference(note.provenance!, 'ref-1', 'https://new');
  assert.equal(relinked.externalReferences[0].sourceHealth, 'regrounded');
  assert.equal(relinked.externalReferences[0].value, 'https://new');
});

test('provenance queries find orphaned, unverified, and dependent tasks', () => {
  const source = makeNote({
    id: 'source',
    provenance: {
      origin: 'imported',
      createdAt: 1,
      updatedAt: 1,
      externalReferences: [{
        id: 'ref',
        kind: 'file',
        label: 'Missing',
        value: '/tmp/missing.md',
        confidence: 1,
        isInferred: false,
        accessStatus: 'missing',
        identityStatus: 'unknown',
        meaningStatus: 'unknown',
        createdAt: 1
      }]
    }
  });
  const task = makeNote({
    id: 'task',
    intent: 'task',
    taskSource: { sourceNoteId: 'source', promotionId: 'p', start: 0, end: 4, text: 'todo', createdAt: 1 }
  });
  const verified = makeNote({ id: 'ok' });
  const notes = [source, task, verified];

  assert.deepEqual(getNotesWithOrphanedEvidence(notes).map((note) => note.id), ['source']);
  assert.deepEqual(getTasksDerivedFromMissingSources(notes).map((note) => note.id), ['task']);
  assert.deepEqual(getNotesWithUnverifiedConclusions(notes).map((note) => note.id).sort(), ['source', 'task']);
  assert.equal(summarizeNoteSourceHealth(source).hasOrphanedEvidence, true);
});
