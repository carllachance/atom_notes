import { useMemo } from 'react';
import { getCompactDisplayTitle } from '../noteText';
import { NoteCardModel, Relationship, RelationshipType } from '../types';
import { getRelationshipTargetNoteId } from '../relationshipLogic';
import { getCanvasWorldBounds, NOTE_CARD_HEIGHT, NOTE_CARD_WIDTH } from '../canvas/world';

type RankedRelationship = {
  relationship: Relationship;
  score: number;
};

type RelationshipWebProps = {
  activeNote: NoteCardModel;
  notes: NoteCardModel[];
  rankedRelationships: RankedRelationship[];
  filter: 'all' | RelationshipType;
  scrollLeft: number;
  scrollTop: number;
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

export function RelationshipWeb({ activeNote, notes, rankedRelationships, filter, scrollLeft, scrollTop, onTraverse }: RelationshipWebProps) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const worldBounds = useMemo(() => getCanvasWorldBounds(notes), [notes]);

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
  const activeCenterX = activeNote.x + NOTE_CARD_WIDTH / 2 + worldBounds.offsetX - scrollLeft;
  const activeCenterY = activeNote.y + NOTE_CARD_HEIGHT / 2 + worldBounds.offsetY - scrollTop;

  return (
    <div className="relationship-web-layer">
      <svg className="relationship-web" preserveAspectRatio="none" aria-hidden="true">
        {visibleTargets.map(({ relationship, target, score }) => {
          const edgeStyle = EDGE_TYPE_STYLES[relationship.type];
          const confidenceOpacity = Math.min(0.44, 0.18 + score * 0.2);
          const targetCenterX = target.x + NOTE_CARD_WIDTH / 2 + worldBounds.offsetX - scrollLeft;
          const targetCenterY = target.y + NOTE_CARD_HEIGHT / 2 + worldBounds.offsetY - scrollTop;
          const controlOffset = Math.max(30, Math.abs(targetCenterX - activeCenterX) * 0.18);
          const path = `M ${activeCenterX} ${activeCenterY} C ${activeCenterX} ${activeCenterY + controlOffset}, ${targetCenterX} ${targetCenterY - controlOffset}, ${targetCenterX} ${targetCenterY}`;

          return (
            <path
              key={relationship.id}
              d={path}
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
          style={{
            transform: `translate(${note.x + worldBounds.offsetX - scrollLeft + 95}px, ${note.y + worldBounds.offsetY - scrollTop + 44}px)`
          }}
          onClick={() => onTraverse(note.id, relationship.id)}
        >
          {getCompactDisplayTitle(note, 36)}
        </button>
      ))}
    </div>
  );
}
