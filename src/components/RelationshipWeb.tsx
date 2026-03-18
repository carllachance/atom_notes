import { useMemo } from 'react';
import { getCompactDisplayTitle } from '../noteText';
import { getRelationshipTargetNoteId } from '../relationshipLogic';
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

const EDGE_TYPE_STYLES: Record<RelationshipType, { color: string }> = {
  related_concept: { color: 'rgba(113, 162, 255, 0.34)' },
  references: { color: 'rgba(177, 132, 255, 0.34)' }
};

function getEdgeLineStyle(relationship: Relationship) {
  if (relationship.explicitness === 'explicit') return undefined;
  return '8 8';
}

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

  return (
    <div className="relationship-web-layer">
      <div className="relationship-web-plane" style={getRelationshipWebPlaneStyle(canvasMetrics)}>
        <svg className="relationship-web" aria-hidden="true">
          {visibleTargets.map(({ relationship, target, score }) => {
            const edgeStyle = EDGE_TYPE_STYLES[relationship.type];
            const confidenceOpacity = Math.min(0.44, 0.18 + score * 0.2);

            return (
              <path
                key={relationship.id}
                d={buildRelationshipEdgePath(activeNote, target)}
                className="relationship-edge"
                data-type={relationship.type}
                data-explicitness={relationship.explicitness}
                stroke={edgeStyle.color}
                strokeOpacity={confidenceOpacity}
                strokeDasharray={getEdgeLineStyle(relationship)}
              />
            );
          })}
        </svg>

        {visibleTargets.map(({ target: note, relationship }) => (
          <button
            key={note.id}
            className="related-node"
            title={relationship.explanation}
            data-type={relationship.type}
            data-explicitness={relationship.explicitness}
            style={getRelatedNodeStyle(note)}
            onClick={() => onTraverse(note.id, relationship.id)}
          >
            {getCompactDisplayTitle(note, 36)}
          </button>
        ))}
      </div>
    </div>
  );
}
