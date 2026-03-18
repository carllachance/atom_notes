import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCapturePlacement } from '../scene/capturePlacement';
import { NoteCardModel } from '../types';

const note = (id: string, x: number, y: number): NoteCardModel => ({
  id,
  title: id,
  body: '',
  anchors: [],
  trace: 'idle',
  x,
  y,
  z: 1,
  createdAt: 1,
  updatedAt: 1,
  archived: false,
  inFocus: false,
  isFocus: false,
  projectIds: [],
  inferredProjectIds: [],
  workspaceId: null,
  inferredRelationships: []
});

test('resolveCapturePlacement offsets from center and avoids the active note footprint deterministically', () => {
  const active = note('active', 420, 280);
  const placement = resolveCapturePlacement([active], { x: 540, y: 360 }, active, 2);
  assert.notEqual(`${placement.x}:${placement.y}`, `${active.x}:${active.y}`);
  assert.ok(placement.x >= 32);
  assert.ok(placement.y >= 32);
});
