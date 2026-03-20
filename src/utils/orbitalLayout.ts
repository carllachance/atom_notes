// Orbital layout computation — pure geometry, no React
import { computeRelationshipVisualProps } from './arcPath';

export interface OrbitalNode {
  noteId: string;
  angle: number;       // degrees
  radius: number;
  x: number;
  y: number;
  ring: 'primary' | 'secondary';
  dominantRelColor: string;
}

interface EdgeLike {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  explicitness?: string;
  lifecycle_state?: string;
  reinforcement_score?: number;
  [key: string]: unknown;
}

// Angular zones by relationship type (degrees, [start, end])
const ZONE_MAP: Record<string, [number, number]> = {
  task_dependency: [315, 405],   // upper-right (405 = 45 + 360)
  action_source:   [315, 405],
  references:      [45, 135],    // lower-right
  derived_from:    [45, 135],
  related_concept: [135, 225],   // lower-left
  same_entity:     [135, 225],
  conflicts_with:  [225, 315],   // upper-left
  duplicate_of:    [225, 315],
};

const DEFAULT_ZONE: [number, number] = [0, 360];

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function getConnectedNoteId(edge: EdgeLike, focalNoteId: string): string {
  return edge.source_id === focalNoteId ? edge.target_id : edge.source_id;
}

function distributeAnglesInZone(count: number, zoneStart: number, zoneEnd: number): number[] {
  if (count === 0) return [];
  const span = zoneEnd - zoneStart;
  if (count === 1) return [zoneStart + span / 2];
  return Array.from({ length: count }, (_, i) => zoneStart + (span / (count - 1)) * i);
}

function getDominantRelColor(edge: EdgeLike): string {
  const props = computeRelationshipVisualProps({
    type: edge.type,
    explicitness: (edge.explicitness as string) ?? 'explicit',
    lifecycle_state: (edge.lifecycle_state as string) ?? 'active',
    reinforcement_score: (edge.reinforcement_score as number) ?? 0.5,
  });
  return props.color;
}

export function computeOrbitalLayout(params: {
  centerX: number;
  centerY: number;
  primaryEdges: EdgeLike[];
  secondaryEdges: EdgeLike[];
  focalNoteId: string;
  primaryRadius?: number;
  secondaryRadius?: number;
}): OrbitalNode[] {
  const {
    centerX,
    centerY,
    primaryEdges,
    secondaryEdges,
    focalNoteId,
    primaryRadius = 200,
    secondaryRadius = 340,
  } = params;

  const nodes: OrbitalNode[] = [];
  const usedAngles: number[] = [];
  const seenNoteIds = new Map<string, string>(); // noteId -> 'primary' | 'secondary'

  // Group primary edges by zone
  const zoneGroups = new Map<string, EdgeLike[]>();
  const defaultEdges: EdgeLike[] = [];

  for (const edge of primaryEdges) {
    const noteId = getConnectedNoteId(edge, focalNoteId);
    if (seenNoteIds.has(noteId)) continue;
    seenNoteIds.set(noteId, 'primary');

    const zoneKey = Object.keys(ZONE_MAP).find((k) => k === edge.type);
    if (zoneKey) {
      const group = zoneGroups.get(zoneKey) ?? [];
      group.push(edge);
      zoneGroups.set(zoneKey, group);
    } else {
      defaultEdges.push(edge);
    }
  }

  // Assign angles per zone
  const processedZones = new Set<string>();
  for (const [type, [zoneStart, zoneEnd]] of Object.entries(ZONE_MAP)) {
    const zoneKey = type;
    if (processedZones.has(zoneKey)) continue;

    // Gather all edge types that share this zone
    const relatedTypes = Object.entries(ZONE_MAP)
      .filter(([, [s, e]]) => s === zoneStart && e === zoneEnd)
      .map(([t]) => t);
    relatedTypes.forEach((t) => processedZones.add(t));

    const zoneEdges = relatedTypes.flatMap((t) => zoneGroups.get(t) ?? []);
    if (zoneEdges.length === 0) continue;

    const angles = distributeAnglesInZone(zoneEdges.length, zoneStart, zoneEnd);
    zoneEdges.forEach((edge, i) => {
      const angle = normalizeAngle(angles[i]);
      const noteId = getConnectedNoteId(edge, focalNoteId);
      usedAngles.push(angle);
      nodes.push({
        noteId,
        angle,
        radius: primaryRadius,
        x: centerX + primaryRadius * Math.cos(toRadians(angle)),
        y: centerY + primaryRadius * Math.sin(toRadians(angle)),
        ring: 'primary',
        dominantRelColor: getDominantRelColor(edge),
      });
    });
  }

  // Default edges: distribute evenly filling 360°
  if (defaultEdges.length > 0) {
    const defaultAngles = distributeAnglesInZone(defaultEdges.length, 0, 360);
    defaultEdges.forEach((edge, i) => {
      const angle = normalizeAngle(defaultAngles[i]);
      const noteId = getConnectedNoteId(edge, focalNoteId);
      usedAngles.push(angle);
      nodes.push({
        noteId,
        angle,
        radius: primaryRadius,
        x: centerX + primaryRadius * Math.cos(toRadians(angle)),
        y: centerY + primaryRadius * Math.sin(toRadians(angle)),
        ring: 'primary',
        dominantRelColor: getDominantRelColor(edge),
      });
    });
  }

  // Secondary edges: distribute evenly, avoid angles within 15° of primary nodes
  const secondaryEdgesFiltered = secondaryEdges.filter((edge) => {
    const noteId = getConnectedNoteId(edge, focalNoteId);
    return !seenNoteIds.has(noteId);
  });

  if (secondaryEdgesFiltered.length > 0) {
    const step = 360 / secondaryEdgesFiltered.length;
    let candidateAngle = 0;
    let placed = 0;

    secondaryEdgesFiltered.forEach((edge) => {
      // Find a candidate angle that avoids existing angles (min 15° separation)
      let tries = 0;
      while (tries < 360) {
        const isClear = usedAngles.every(
          (a) => Math.abs(normalizeAngle(candidateAngle) - a) >= 15
        );
        if (isClear) break;
        candidateAngle += 5;
        tries += 5;
      }
      const angle = normalizeAngle(candidateAngle);
      const noteId = getConnectedNoteId(edge, focalNoteId);
      if (!seenNoteIds.has(noteId)) {
        seenNoteIds.set(noteId, 'secondary');
        usedAngles.push(angle);
        nodes.push({
          noteId,
          angle,
          radius: secondaryRadius,
          x: centerX + secondaryRadius * Math.cos(toRadians(angle)),
          y: centerY + secondaryRadius * Math.sin(toRadians(angle)),
          ring: 'secondary',
          dominantRelColor: getDominantRelColor(edge),
        });
        placed++;
      }
      candidateAngle += step;
    });
  }

  return nodes;
}
