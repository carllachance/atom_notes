import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOrbitalLayout } from '../utils/orbitalLayout';

const center = { centerX: 500, centerY: 400 };
const focalNoteId = 'focal';

function makeEdge(type: string, toId: string, isPrimary = true) {
  return {
    id: `edge-${toId}`,
    source_id: focalNoteId,
    target_id: toId,
    type,
    visual_group: isPrimary ? 'primary' : 'secondary',
  };
}

test('task_dependency edge results in node in upper-right quadrant (angle 315-45 via 0)', () => {
  const nodes = computeOrbitalLayout({
    ...center,
    primaryEdges: [makeEdge('task_dependency', 'note-a')],
    secondaryEdges: [],
    focalNoteId,
  });
  assert.equal(nodes.length, 1);
  const node = nodes[0];
  // Upper-right zone: 315–405 (normalized: 315–360 or 0–45)
  const angle = node.angle;
  const inUpperRight = angle >= 315 || angle <= 45;
  assert.ok(inUpperRight, `Expected angle in upper-right, got ${angle}`);
});

test('conflicts_with edge results in node in upper-left quadrant (225–315)', () => {
  const nodes = computeOrbitalLayout({
    ...center,
    primaryEdges: [makeEdge('conflicts_with', 'note-b')],
    secondaryEdges: [],
    focalNoteId,
  });
  assert.equal(nodes.length, 1);
  const node = nodes[0];
  assert.ok(node.angle >= 225 && node.angle <= 315, `Expected angle 225-315, got ${node.angle}`);
});

test('primary nodes are at exactly primaryRadius distance from center', () => {
  const primaryRadius = 200;
  const nodes = computeOrbitalLayout({
    ...center,
    primaryEdges: [
      makeEdge('task_dependency', 'note-a'),
      makeEdge('references', 'note-b'),
      makeEdge('conflicts_with', 'note-c'),
    ],
    secondaryEdges: [],
    focalNoteId,
    primaryRadius,
  });
  for (const node of nodes.filter((n) => n.ring === 'primary')) {
    const dx = node.x - center.centerX;
    const dy = node.y - center.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    assert.ok(Math.abs(dist - primaryRadius) < 0.1, `Expected radius ~${primaryRadius}, got ${dist}`);
  }
});

test('no two nodes share the same angle within 1 degree tolerance', () => {
  const nodes = computeOrbitalLayout({
    ...center,
    primaryEdges: [
      makeEdge('task_dependency', 'note-a'),
      makeEdge('references', 'note-b'),
      makeEdge('related_concept', 'note-c'),
      makeEdge('conflicts_with', 'note-d'),
    ],
    secondaryEdges: [],
    focalNoteId,
  });
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const diff = Math.abs(nodes[i].angle - nodes[j].angle);
      assert.ok(diff > 1, `Nodes ${i} and ${j} share angle: ${nodes[i].angle}`);
    }
  }
});

test('secondary nodes are at secondaryRadius distance from center', () => {
  const secondaryRadius = 340;
  const nodes = computeOrbitalLayout({
    ...center,
    primaryEdges: [],
    secondaryEdges: [makeEdge('references', 'sec-a', false)],
    focalNoteId,
    secondaryRadius,
  });
  const secNodes = nodes.filter((n) => n.ring === 'secondary');
  assert.equal(secNodes.length, 1);
  const dx = secNodes[0].x - center.centerX;
  const dy = secNodes[0].y - center.centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  assert.ok(Math.abs(dist - secondaryRadius) < 0.1, `Expected radius ~${secondaryRadius}, got ${dist}`);
});
