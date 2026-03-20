import { useMemo, useState } from 'react';
import { NoteCardModel, Relationship, RelationshipType } from '../types';
import { computeArcPath, computeRelationshipVisualProps } from '../utils/arcPath';
import { computeOrbitalLayout, OrbitalNode } from '../utils/orbitalLayout';
import { useTraversalHistory } from '../store/sessionSlice';

interface RelationshipGraphProps {
  focalNote: NoteCardModel;
  focalNotePosition: { x: number; y: number };
  relationships: Relationship[];
  notes: NoteCardModel[];
  activeFilter: RelationshipType | null;
  ringByRelationshipId?: Record<string, 'primary' | 'secondary'>;
  onNodeClick: (noteId: string) => void;
}

/** Classify relationships as primary (direct) or secondary (weaker/inferred) */
function classifyEdge(rel: Relationship): 'primary' | 'secondary' {
  if (rel.explicitness === 'explicit' && rel.state === 'confirmed') return 'primary';
  return 'secondary';
}

export function RelationshipGraph({
  focalNote,
  focalNotePosition,
  relationships,
  notes,
  activeFilter,
  ringByRelationshipId,
  onNodeClick,
}: RelationshipGraphProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const traversalHistory = useTraversalHistory();

  const notesById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);

  // Build edge data for orbital layout
  const edges = useMemo(() =>
    relationships.map((rel) => ({
      id: rel.id,
      source_id: rel.fromId,
      target_id: rel.toId,
      type: rel.type,
      visual_group: ringByRelationshipId?.[rel.id] ?? classifyEdge(rel),
      explicitness: rel.explicitness,
      lifecycle_state: rel.state === 'confirmed' ? 'active' : 'proposed',
      reinforcement_score: rel.confidence ?? 0.5,
    })),
    [relationships, ringByRelationshipId]
  );

  const center = focalNotePosition;

  const orbitalNodes = useMemo(() =>
    computeOrbitalLayout({
      centerX: center.x,
      centerY: center.y,
      primaryEdges: edges.filter((e) => e.visual_group === 'primary'),
      secondaryEdges: edges.filter((e) => e.visual_group === 'secondary'),
      focalNoteId: focalNote.id,
    }),
    [center.x, center.y, edges, focalNote.id]
  );

  const nodePositionById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of orbitalNodes) {
      map.set(node.noteId, { x: node.x, y: node.y });
    }
    return map;
  }, [orbitalNodes]);

  function getNoteTitleById(noteId: string): string {
    return notesById.get(noteId)?.title ?? noteId.slice(0, 8);
  }

  function renderArc(node: OrbitalNode, opacity: number, strokeScale = 1.0) {
    const edge = edges.find(
      (e) =>
        (e.source_id === focalNote.id && e.target_id === node.noteId) ||
        (e.target_id === focalNote.id && e.source_id === node.noteId)
    );
    if (!edge) return null;

    const visual = computeRelationshipVisualProps({
      type: edge.type,
      explicitness: edge.explicitness,
      lifecycle_state: edge.lifecycle_state,
      reinforcement_score: edge.reinforcement_score,
    });
    const isFiltered = activeFilter !== null;
    const matchesFilter = activeFilter === edge.type;
    const finalOpacity = isFiltered ? (matchesFilter ? visual.opacity : 0.04) : opacity * visual.opacity;
    const isHovered = hoveredEdgeId === edge.id;

    return (
      <path
        key={`arc-${node.noteId}`}
        d={computeArcPath(center, node, 0.18)}
        stroke={visual.color}
        strokeWidth={isHovered ? visual.strokeWidth * 1.5 * strokeScale : visual.strokeWidth * strokeScale}
        strokeDasharray={node.ring === 'secondary' ? (visual.strokeDasharray || '3 6') : (visual.strokeDasharray || undefined)}
        opacity={isHovered ? Math.min(visual.opacity * 1.4, 1.0) : finalOpacity}
        fill="none"
        strokeLinecap="round"
        style={{ transition: 'opacity var(--transition-base), stroke-width var(--transition-fast)' }}
        onMouseEnter={() => setHoveredEdgeId(edge.id)}
        onMouseLeave={() => setHoveredEdgeId(null)}
      />
    );
  }

  return (
    <svg
      className="relationship-graph"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {/* Layer 1: Memory trails */}
      {traversalHistory.map((entry, index) => {
        const fromPos = entry.fromNoteId === focalNote.id ? center : nodePositionById.get(entry.fromNoteId);
        const toPos = entry.toNoteId === focalNote.id ? center : nodePositionById.get(entry.toNoteId);
        if (!fromPos || !toPos) return null;
        const trailOpacity = 0.06 + (index / traversalHistory.length) * 0.09;
        return (
          <path
            key={`trail-${index}`}
            d={computeArcPath(fromPos, toPos, 0.10)}
            stroke="rgba(123, 104, 238, 1)"
            strokeWidth={0.8}
            strokeDasharray="3 6"
            opacity={trailOpacity}
            fill="none"
            pointerEvents="none"
          />
        );
      })}

      {/* Layer 2: Focal glow rings */}
      <circle cx={center.x} cy={center.y} r={44} fill="none" stroke="rgba(123,104,238,0.25)" strokeWidth={1} />
      <circle cx={center.x} cy={center.y} r={62} fill="none" stroke="rgba(123,104,238,0.10)" strokeWidth={1} />

      {/* Layer 3: Secondary orbital arcs */}
      {orbitalNodes.filter((n) => n.ring === 'secondary').map((node) => renderArc(node, 0.6, 0.6))}

      {/* Layer 4: Primary orbital arcs */}
      {orbitalNodes.filter((n) => n.ring === 'primary').map((node) => renderArc(node, 1.0))}

      {/* Layer 5: Secondary node circles */}
      {orbitalNodes.filter((n) => n.ring === 'secondary').map((node) => (
        <g
          key={`node-secondary-${node.noteId}`}
          onClick={() => onNodeClick(node.noteId)}
          style={{ cursor: 'pointer', pointerEvents: 'all' }}
        >
          <circle cx={node.x} cy={node.y} r={14} fill="var(--note-card-bg)" stroke={node.dominantRelColor} strokeWidth={1} opacity={0.45} />
          <text x={node.x} y={node.y + 4} textAnchor="middle" fill="var(--text-tertiary)" fontSize={8} fontFamily="var(--font-stack)">
            {getNoteTitleById(node.noteId)?.substring(0, 12)}
          </text>
        </g>
      ))}

      {/* Layer 6: Primary node circles */}
      {orbitalNodes.filter((n) => n.ring === 'primary').map((node) => (
        <g
          key={`node-primary-${node.noteId}`}
          onClick={() => onNodeClick(node.noteId)}
          style={{ cursor: 'pointer', pointerEvents: 'all' }}
        >
          <circle cx={node.x} cy={node.y} r={26} fill="var(--note-card-bg)" stroke={node.dominantRelColor} strokeWidth={1.5} opacity={0.85} />
          <text x={node.x} y={node.y + 4} textAnchor="middle" fill="var(--text-secondary)" fontSize={10} fontFamily="var(--font-stack)">
            {getNoteTitleById(node.noteId)?.substring(0, 14)}
          </text>
        </g>
      ))}
    </svg>
  );
}
