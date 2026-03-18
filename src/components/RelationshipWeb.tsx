import { useMemo } from 'react';
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
  onTraverse: (targetNoteId: string, relationshipId: string) => void;
};

type VisibleEdge = {
  relationship: Relationship;
  target: NoteCardModel;
  score: number;
};

export function RelationshipWeb({
  activeNote,
  notes,
  rankedRelationships,
  filter,
  canvasMetrics,
  onTraverse
}: RelationshipWebProps) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  const visibleEdges = useMemo(() => {
    const filtered = rankedRelationships.filter(
      (item) => filter === 'all' || item.relationship.type === filter
    );

    return filtered
      .slice(0, 10)
      .map((item) => {
        const targetId = getRelationshipTargetNoteId(item.relationship, activeNote.id);
        const target = notesById.get(targetId);
        if (!target) return null;
        return {
          relationship: item.relationship,
          target,
          score: item.score
        } satisfies VisibleEdge;
      })
      .filter((item): item is VisibleEdge => Boolean(item));
  }, [activeNote.id, filter, notesById, rankedRelationships]);

  const visibleTargets = visibleEdges.slice(0, 8);
  const emphasis = filter === 'all' ? 'default' : 'selected';

  return (
    <div className="relationship-web-layer">
      <div className="relationship-web-plane" style={getRelationshipWebPlaneStyle(canvasMetrics)}>
        <svg className="relationship-web" aria-hidden="true">
          {visibleTargets.map(({ relationship, target, score }) => {
            const visual = getSemanticRelationshipVisual(relationship, score, emphasis);

            return (
              <path
                key={relationship.id}
                d={buildRelationshipEdgePath(activeNote, target)}
                className="relationship-edge"
                data-type={relationship.type}
                data-explicitness={relationship.explicitness}
                data-relationship-category={visual.category}
                stroke={visual.edge.stroke}
                strokeOpacity={visual.edge.opacity}
                strokeDasharray={visual.edge.dasharray === 'none' ? undefined : visual.edge.dasharray}
                strokeWidth={visual.edge.strokeWidth}
                style={{ filter: `drop-shadow(0 0 ${visual.edge.blurRadius}px rgba(67, 90, 138, 0.08))` }}
              />
            );
          })}
        </svg>

        {visibleTargets.map(({ target: note, relationship, score }) => {
          const visual = getSemanticRelationshipVisual(relationship, score, emphasis);
          return (
            <button
              key={note.id}
              className="related-node"
              title={relationship.explanation}
              data-type={relationship.type}
              data-explicitness={relationship.explicitness}
              data-relationship-category={visual.category}
              style={{
                ...getRelatedNodeStyle(note),
                borderStyle: visual.node.borderStyle,
                borderColor: visual.node.borderColor,
                background: `color-mix(in srgb, rgba(17, 25, 39, 0.82) ${Math.round(visual.node.backgroundOpacity * 100)}%, transparent)`,
                boxShadow: `0 6px 16px rgba(2, 4, 9, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.02), 0 0 18px color-mix(in srgb, ${visual.node.glowColor} ${Math.round(visual.node.glowOpacity * 100)}%, transparent)`
              }}
              onClick={() => onTraverse(note.id, relationship.id)}
            >
              <span className="related-node-kind" style={{ opacity: visual.node.labelOpacity }}>
                {visual.label}
              </span>
              <span className="related-node-title">{getCompactDisplayTitle(note, 36)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
