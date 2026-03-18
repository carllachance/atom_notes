import { useEffect, useMemo, useRef, useState } from 'react';
import { ProjectConnectorSegment } from '../projects/projectSelectors';
import { NoteCardModel, Relationship } from '../types';

export type ClusterLayoutNode = Pick<NoteCardModel, 'id' | 'x' | 'y'>;

type ClusterStateNode = {
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type ClusterSimulationState = Record<string, ClusterStateNode>;

type Vector = { x: number; y: number };

type ClusterInteractionState = {
  forceScaleById?: Record<string, number>;
};

type ClusterForces = {
  connectedAttraction: number;
  unconnectedRepulsion: number;
  anchorStrength: number;
  damping: number;
  maxSpeed: number;
  maxOffset: number;
  attractionDistance: number;
  repulsionDistance: number;
};

export const DEFAULT_CLUSTER_FORCES: ClusterForces = {
  connectedAttraction: 0.0038,
  unconnectedRepulsion: 0.012,
  anchorStrength: 0.028,
  damping: 0.78,
  maxSpeed: 0.32,
  maxOffset: 18,
  attractionDistance: 260,
  repulsionDistance: 220
};

function pairKey(a: string, b: string) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function distance(a: Vector, b: Vector) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildConnectionIndex(notes: ClusterLayoutNode[], relationships: Relationship[]) {
  const visibleIds = new Set(notes.map((note) => note.id));
  const connectedPairs = new Set<string>();

  for (const relationship of relationships) {
    if (!visibleIds.has(relationship.fromId) || !visibleIds.has(relationship.toId) || relationship.fromId === relationship.toId) continue;
    connectedPairs.add(pairKey(relationship.fromId, relationship.toId));
  }

  return connectedPairs;
}

export function syncClusterState(notes: ClusterLayoutNode[], previous: ClusterSimulationState = {}): ClusterSimulationState {
  const next: ClusterSimulationState = {};

  for (const note of notes) {
    const prior = previous[note.id];
    const anchorShiftX = note.x - (prior?.anchorX ?? note.x);
    const anchorShiftY = note.y - (prior?.anchorY ?? note.y);

    next[note.id] = {
      anchorX: note.x,
      anchorY: note.y,
      x: prior ? prior.x + anchorShiftX : note.x,
      y: prior ? prior.y + anchorShiftY : note.y,
      vx: prior?.vx ?? 0,
      vy: prior?.vy ?? 0
    };
  }

  return next;
}

export function stepClusterState(
  notes: ClusterLayoutNode[],
  relationships: Relationship[],
  previous: ClusterSimulationState,
  overrides: Partial<ClusterForces> = {},
  interaction: ClusterInteractionState = {}
): ClusterSimulationState {
  const forces = { ...DEFAULT_CLUSTER_FORCES, ...overrides };
  const forceScaleById = interaction.forceScaleById ?? {};
  const state = syncClusterState(notes, previous);
  const connectedPairs = buildConnectionIndex(notes, relationships);
  const impulseById = new Map<string, Vector>();
  const forceScaleFor = (id: string) => Math.max(0, Math.min(1, forceScaleById[id] ?? 1));

  for (const note of notes) {
    const current = state[note.id];
    const forceScale = forceScaleFor(note.id);
    const anchorStrength = forces.anchorStrength * (1.55 - forceScale * 0.35);
    impulseById.set(note.id, {
      x: (current.anchorX - current.x) * anchorStrength,
      y: (current.anchorY - current.y) * anchorStrength
    });
  }

  for (let index = 0; index < notes.length; index += 1) {
    const currentNote = notes[index];
    const current = state[currentNote.id];

    for (let otherIndex = index + 1; otherIndex < notes.length; otherIndex += 1) {
      const otherNote = notes[otherIndex];
      const other = state[otherNote.id];
      const dx = other.x - current.x;
      const dy = other.y - current.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / dist;
      const ny = dy / dist;
      const currentImpulse = impulseById.get(currentNote.id)!;
      const otherImpulse = impulseById.get(otherNote.id)!;
      const connected = connectedPairs.has(pairKey(currentNote.id, otherNote.id));
      const interactionScale = Math.min(forceScaleFor(currentNote.id), forceScaleFor(otherNote.id));

      if (interactionScale <= 0) continue;

      if (connected) {
        const attractionDistance = Math.min(forces.attractionDistance, Math.max(140, distance({ x: current.anchorX, y: current.anchorY }, { x: other.anchorX, y: other.anchorY }) * 0.9));
        if (dist > attractionDistance) {
          const attraction = (dist - attractionDistance) * forces.connectedAttraction * interactionScale;
          currentImpulse.x += nx * attraction;
          currentImpulse.y += ny * attraction;
          otherImpulse.x -= nx * attraction;
          otherImpulse.y -= ny * attraction;
        }
      } else if (dist < forces.repulsionDistance) {
        const repulsion = ((forces.repulsionDistance - dist) / forces.repulsionDistance) * forces.unconnectedRepulsion * interactionScale;
        currentImpulse.x -= nx * repulsion;
        currentImpulse.y -= ny * repulsion;
        otherImpulse.x += nx * repulsion;
        otherImpulse.y += ny * repulsion;
      }
    }
  }

  const next: ClusterSimulationState = {};

  for (const note of notes) {
    const current = state[note.id];
    const forceScale = forceScaleFor(note.id);

    if (forceScale <= 0) {
      next[note.id] = {
        anchorX: current.anchorX,
        anchorY: current.anchorY,
        x: current.anchorX,
        y: current.anchorY,
        vx: 0,
        vy: 0
      };
      continue;
    }

    const impulse = impulseById.get(note.id)!;
    let vx = (current.vx + impulse.x) * forces.damping;
    let vy = (current.vy + impulse.y) * forces.damping;
    const maxSpeed = forces.maxSpeed * (0.35 + forceScale * 0.65);
    const speed = Math.hypot(vx, vy);

    if (speed > maxSpeed) {
      const speedScale = maxSpeed / speed;
      vx *= speedScale;
      vy *= speedScale;
    }

    let x = current.x + vx;
    let y = current.y + vy;
    const offsetX = x - current.anchorX;
    const offsetY = y - current.anchorY;
    const offset = Math.hypot(offsetX, offsetY);
    const maxOffset = Math.max(6, forces.maxOffset * (0.4 + forceScale * 0.6));

    if (offset > maxOffset) {
      const offsetScale = maxOffset / offset;
      x = current.anchorX + offsetX * offsetScale;
      y = current.anchorY + offsetY * offsetScale;
      vx *= 0.42;
      vy *= 0.42;
    }

    next[note.id] = {
      anchorX: current.anchorX,
      anchorY: current.anchorY,
      x,
      y,
      vx,
      vy
    };
  }

  return next;
}

export function isClusterStateSettled(state: ClusterSimulationState, threshold = 0.01) {
  return Object.values(state).every((node) => {
    const speed = Math.hypot(node.vx, node.vy);
    const offset = Math.hypot(node.x - node.anchorX, node.y - node.anchorY);
    return speed <= threshold && offset <= threshold;
  });
}

export function getClusteredPositions(notes: ClusterLayoutNode[], state: ClusterSimulationState) {
  return Object.fromEntries(notes.map((note) => [note.id, { x: state[note.id]?.x ?? note.x, y: state[note.id]?.y ?? note.y }])) as Record<string, { x: number; y: number }>;
}

export function applyClusteredPositions<T extends ClusterLayoutNode>(notes: T[], positions: Record<string, { x: number; y: number }>) {
  return notes.map((note) => {
    const position = positions[note.id];
    return position ? { ...note, x: position.x, y: position.y } : note;
  });
}

function noteCenter(note: ClusterLayoutNode) {
  return {
    x: note.x + 135,
    y: note.y + 62
  };
}

export function buildClusteredProjectConnectorSegments(notes: ClusterLayoutNode[]): ProjectConnectorSegment[] {
  if (notes.length < 2) return [];

  const remaining = notes.map((note) => ({ note, center: noteCenter(note) }));
  const centroid = remaining.reduce((acc, entry) => ({ x: acc.x + entry.center.x, y: acc.y + entry.center.y }), { x: 0, y: 0 });
  centroid.x /= remaining.length;
  centroid.y /= remaining.length;

  remaining.sort((a, b) => distance(a.center, centroid) - distance(b.center, centroid));
  const connected = [remaining.shift()!];
  const segments: ProjectConnectorSegment[] = [];

  while (remaining.length > 0) {
    let bestCandidateIndex = 0;
    let bestConnectedIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let candidateIndex = 0; candidateIndex < remaining.length; candidateIndex += 1) {
      for (let connectedIndex = 0; connectedIndex < connected.length; connectedIndex += 1) {
        const nextDistance = distance(remaining[candidateIndex].center, connected[connectedIndex].center);
        if (nextDistance < bestDistance) {
          bestDistance = nextDistance;
          bestCandidateIndex = candidateIndex;
          bestConnectedIndex = connectedIndex;
        }
      }
    }

    const candidate = remaining.splice(bestCandidateIndex, 1)[0];
    const anchor = connected[bestConnectedIndex];
    segments.push({ from: anchor.center, to: candidate.center });
    connected.push(candidate);
  }

  return segments;
}

export function useSubtleCanvasClustering(
  notes: NoteCardModel[],
  relationships: Relationship[],
  paused: boolean,
  interaction: ClusterInteractionState = {}
) {
  const simulationRef = useRef<ClusterSimulationState>({});
  const frameRef = useRef<number | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    getClusteredPositions(notes, syncClusterState(notes))
  );

  const noteInputs = useMemo(() => notes.map(({ id, x, y }) => ({ id, x, y })), [notes]);

  useEffect(() => {
    simulationRef.current = syncClusterState(noteInputs, simulationRef.current);
    setPositions(getClusteredPositions(noteInputs, simulationRef.current));
  }, [noteInputs]);

  useEffect(() => {
    if (paused || noteInputs.length < 2) return;

    let active = true;
    const tick = () => {
      if (!active) return;
      simulationRef.current = stepClusterState(noteInputs, relationships, simulationRef.current, {}, interaction);
      setPositions(getClusteredPositions(noteInputs, simulationRef.current));
      if (!isClusterStateSettled(simulationRef.current)) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      active = false;
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [interaction, paused, noteInputs, relationships]);

  return positions;
}
