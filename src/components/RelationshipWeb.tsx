import { useMemo, useState } from 'react';
import { getCompactDisplayTitle } from '../noteText';
import { getRelationshipTargetNoteId } from '../relationshipLogic';
import { getSemanticRelationshipVisual } from '../relationships/relationshipVisuals';
import { NoteCardModel, Relationship, RelationshipType } from '../types';
import {
  CanvasViewportMetrics,
  buildRelationshipEdgePath,
  getRelatedNodeStyle,
  getRelationshipWebPlaneStyle
} from './relationshipWebGeometry';

type RankedRelationship = {
  relationship: Relationship;
  score: number;
};

type RelationshipWebProps = {
  activeNote: NoteCardModel;
  notes: NoteCardModel[];
  rankedRelationships: RankedRelationship[];
  filter: 'all' | RelationshipType;
  canvasMetrics: CanvasViewportMetrics | null;
  hoveredNoteId: string | null;
  onInspectRelationship: (relationshipId: string) => void;
};

type VisibleEdge = {
  relationship: Relationship;
  target: NoteCardModel;
  score: number;
};

export function RelationshipWeb({ activeNote, notes, rankedRelationships, filter, canvasMetrics, hoveredNoteId, onInspectRelationship }: RelationshipWebProps) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const [localHoveredNoteId, setLocalHoveredNoteId] = useState<string | null>(null);

  const visibleEdges = useMemo(() => {
    const filtered = rankedRelationships.filter((item) => filter === 'all' || item.relationship.type === filter);

    return filtered
      .slice(0, 10)
      .map((item) => {
        const targetId = getRelationshipTargetNoteId(item.relationship, activeNote.id);
        const target = notesById.get(targetId);
        if (!target) return null;
        return { relationship: item.relationship, target, score: item.score } satisfies VisibleEdge;
      })
      .filter((item): item is VisibleEdge => Boolean(item));
  }, [activeNote.id, filter, notesById, rankedRelationships]);

  const visibleTargets = visibleEdges.slice(0, 8);
  const emphasis = filter === 'all' ? 'default' : 'selected';
  const emphasizedTargetId = localHoveredNoteId ?? hoveredNoteId;
  const hoverActive = visibleTargets.some(({ target }) => target.id === emphasizedTargetId);

  return (
    <div className="relationship-web-layer" data-hover-active={hoverActive ? 'true' : 'false'}>
      <div className="relationship-web-plane" style={getRelationshipWebPlaneStyle(canvasMetrics)}>
        <svg className="relationship-web" aria-hidden="true">
          <defs>
            <marker id="relationship-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(201, 213, 244, 0.62)" />
            </marker>
          </defs>
          {visibleTargets.map(({ relationship, target, score }) => {
            const isHovered = emphasizedTargetId === target.id;
            const visual = getSemanticRelationshipVisual(relationship, score, isHovered ? 'hovered' : emphasis);
            const hoverStrokeOpacity = hoverActive
              ? isHovered
                ? Math.min(0.92, visual.edge.opacity * 2.5)
                : Math.max(0.06, visual.edge.opacity * 0.16)
              : visual.edge.opacity;
            const hoverStrokeWidth = hoverActive
              ? isHovered
                ? Math.max(visual.edge.strokeWidth * 2.4, visual.edge.strokeWidth + 2.2)
                : Math.max(0.85, visual.edge.strokeWidth * 0.72)
              : visual.edge.strokeWidth;
            return (
              <path
                key={relationship.id}
                d={buildRelationshipEdgePath(activeNote, target)}
                className={`relationship-edge ${isHovered ? 'relationship-edge--hovered' : hoverActive ? 'relationship-edge--muted' : ''} ${isHovered && relationship.directional ? 'relationship-edge--flowing' : ''} ${isHovered && !relationship.directional ? 'relationship-edge--pulsing' : ''}`}
                data-type={relationship.type}
                data-explicitness={relationship.explicitness}
                data-relationship-category={visual.category}
                stroke={visual.edge.stroke}
                strokeOpacity={hoverStrokeOpacity}
                strokeDasharray={isHovered && relationship.directional ? '12 10' : visual.edge.dasharray === 'none' ? undefined : visual.edge.dasharray}
                strokeWidth={hoverStrokeWidth}
                markerEnd={relationship.directional ? 'url(#relationship-arrow)' : undefined}
                style={{ filter: isHovered ? `drop-shadow(0 0 ${visual.edge.blurRadius + 8}px rgba(164, 196, 255, 0.34)) brightness(1.22)` : hoverActive ? 'brightness(0.72)' : `drop-shadow(0 0 ${visual.edge.blurRadius}px rgba(67, 90, 138, 0.08))` }}
                onClick={() => onInspectRelationship(relationship.id)}
              />
            );
          })}
        </svg>

        {visibleTargets.map(({ target: note, relationship, score }) => {
          const isHovered = emphasizedTargetId === note.id;
          const visual = getSemanticRelationshipVisual(relationship, score, isHovered ? 'hovered' : emphasis);
          const nodeStyle = getRelatedNodeStyle(note);
          return (
            <button
              key={note.id}
              className={`related-node ${isHovered ? 'related-node--hovered' : hoverActive ? 'related-node--muted' : ''}`}
              title={`${visual.label}${visual.structure === 'structural' ? ' · structural' : relationship.directional ? ' · directional' : ''} · ${relationship.explicitness === 'inferred' ? relationship.explanation : visual.description}`}
              data-type={relationship.type}
              data-explicitness={relationship.explicitness}
              data-relationship-category={visual.category}
              style={{
                ...nodeStyle,
                transform: `${nodeStyle.transform ?? ''}${isHovered ? ' scale(1.04)' : ''}`.trim(),
                borderStyle: visual.node.borderStyle,
                borderColor: visual.node.borderColor,
                background: `color-mix(in srgb, rgba(17, 25, 39, 0.82) ${Math.round(visual.node.backgroundOpacity * 100)}%, transparent)`,
                boxShadow: isHovered
                  ? `0 10px 28px rgba(2, 4, 9, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 24px color-mix(in srgb, ${visual.node.glowColor} 42%, transparent)`
                  : `0 6px 16px rgba(2, 4, 9, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.02), 0 0 18px color-mix(in srgb, ${visual.node.glowColor} ${Math.round(visual.node.glowOpacity * 100)}%, transparent)`
              }}
              onMouseEnter={() => setLocalHoveredNoteId(note.id)}
              onMouseLeave={() => setLocalHoveredNoteId((current) => (current === note.id ? null : current))}
              onClick={() => onInspectRelationship(relationship.id)}
            >
              <span className="related-node-kind" style={{ opacity: visual.node.labelOpacity }}>{visual.label}</span>
              <span className="related-node-title">{getCompactDisplayTitle(note, 36)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
