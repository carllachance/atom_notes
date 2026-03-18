import test from 'node:test';
import assert from 'node:assert/strict';
import { findActiveWikiLink, getMatchingNotes, getProactiveLinkSuggestions, inferRelationshipTypeFromContext } from '../relationships/inlineLinking';
import type { NoteCardModel } from '../types';

function note(id: string, title: string, body = ''): NoteCardModel {
  return {
    id,
    title,
    body,
    anchors: [],
    trace: 'idle',
    x: 0,
    y: 0,
    z: 1,
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    projectIds: [],
    inferredProjectIds: [],
    workspaceId: null,
    inferredRelationships: []
  };
}

test('inlineLinking finds the active wiki-link token before it closes', () => {
  const body = 'Need [[archit';
  assert.deepEqual(findActiveWikiLink(body, body.length), { start: 5, end: body.length, query: 'archit' });
});

test('inlineLinking infers relationship type from nearby writing context', () => {
  const body = 'This depends on [[data model';
  const match = findActiveWikiLink(body, body.length);
  assert.ok(match);
  if (!match) throw new Error('Expected active wiki link match');
  assert.deepEqual(inferRelationshipTypeFromContext(body, match.start), {
    type: 'depends_on',
    reason: 'Dependency language nearby.'
  });
});

test('inlineLinking ranks title prefix matches ahead of looser body matches', () => {
  const matches = getMatchingNotes(
    [
      note('source', 'Source note'),
      note('a', 'Architecture decision'),
      note('b', 'Roadmap', 'Architecture is mentioned here.')
    ],
    'source',
    'arch'
  );

  assert.deepEqual(matches.map((entry) => entry.id), ['a', 'b']);
});

test('inlineLinking returns up to three proactive suggestions using text and context cues', () => {
  const source = note('source', 'Launch checklist', 'This depends on Architecture decision and release notes.');
  source.projectIds = ['p1'];
  source.workspaceId = 'w1';

  const suggestions = getProactiveLinkSuggestions({
    source,
    notes: [
      source,
      { ...note('a', 'Architecture decision', 'Release plan system design'), projectIds: ['p1'], workspaceId: 'w1' },
      { ...note('b', 'Release notes', 'Customer-facing summary'), projectIds: ['p1'], workspaceId: 'w1' },
      { ...note('c', 'Deployment runbook', 'Supports release execution'), projectIds: ['p1'], workspaceId: null },
      { ...note('d', 'Unrelated thought', 'Completely different topic'), projectIds: [], workspaceId: null }
    ]
  });

  assert.equal(suggestions.length, 3);
  assert.deepEqual(suggestions.map((entry) => entry.targetId), ['a', 'b', 'c']);
  assert.equal(suggestions[0].type, 'depends_on');
});

test('inlineLinking returns human-readable proactive suggestion reasons', () => {
  const source = note('source', 'Release handoff', 'Need approvals and sequencing for launch.');
  source.workspaceId = 'w1';
  source.projectIds = ['p1'];
  source.anchors = ['release'];

  const sameProjectSuggestions = getProactiveLinkSuggestions({
    source,
    notes: [
      source,
      { ...note('a', 'Decision log', 'Sequencing approvals for launch gates.'), workspaceId: 'w1', projectIds: ['p1'] }
    ]
  });
  const sharedTagSuggestions = getProactiveLinkSuggestions({
    source,
    notes: [
      source,
      { ...note('b', 'Operations checklist', 'Release sequencing for launch execution.'), anchors: ['release'] }
    ]
  });
  assert.equal(sameProjectSuggestions[0]?.reason, 'Same project and overlapping language.');
  assert.equal(sharedTagSuggestions[0]?.reason, 'Shared tags.');
});
