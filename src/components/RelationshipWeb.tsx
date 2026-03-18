import { useMemo } from 'react';
import { getCompactDisplayTitle } from '../noteText';
import {
  getRelationshipStateLabel,
  getRelationshipTargetNoteId,
  isHistoricalRelationship,
  RankedRelationship
} from '../relationshipLogic';
import { NoteCardModel, Relationship, RelationshipFilter, RelationshipType } from '../types';

type RelationshipWebProps = {
  activeNote: NoteCardModel;
  notes: NoteCardModel[];
  rankedRelationships: RankedRelationship[];
  filter: RelationshipFilter;
  onTraverse: (targetNoteId: string, relationshipId: string) => void;
};

type VisibleEdge = {
  relationship: Relationship;
  target: NoteCardModel;
  score: number;
};

const NOTE_CARD_WIDTH = 270;
const NOTE_CARD_HEIGHT = 124;
const EDGE_TYPE_STYLES: Record<RelationshipType, { color: string }> = {
  related_concept: { color: 'rgba(113, 162, 255, 0.34)' },
  references: { color: 'rgba(177, 132, 255, 0.34)' }
};

function getEdgeLineStyle(relationship: Relationship) {
  if (isHistoricalRelationship(relationship)) return '2 10';
  if (relationship.explicitness === 'explicit') return undefined;
  return '8 8';
}

export function RelationshipWeb({ activeNote, notes, rankedRelationships, filter, onTraverse }: RelationshipWebProps) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  const visibleEdges = useMemo(() => {
    return rankedRelationships
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
  }, [activeNote.id, notesById, rankedRelationships]);

  const visibleTargets = visibleEdges.slice(0, 8);
  const activeCenterX = activeNote.x + NOTE_CARD_WIDTH / 2;
  const activeCenterY = activeNote.y + NOTE_CARD_HEIGHT / 2;

  return (
    <div className="relationship-web-layer" data-filter={filter}>
      <svg className="relationship-web" viewBox="0 0 1800 1100" preserveAspectRatio="none" aria-hidden="true">
        {visibleTargets.map(({ relationship, target, score }) => {
          const edgeStyle = EDGE_TYPE_STYLES[relationship.type];
          const confidenceOpacity = isHistoricalRelationship(relationship)
            ? Math.min(0.18, 0.08 + score * 0.06)
            : Math.min(0.44, 0.18 + score * 0.2);
          const targetCenterX = target.x + NOTE_CARD_WIDTH / 2;
          const targetCenterY = target.y + NOTE_CARD_HEIGHT / 2;
          const controlOffset = Math.max(30, Math.abs(targetCenterX - activeCenterX) * 0.18);
          const path = `M ${activeCenterX} ${activeCenterY} C ${activeCenterX} ${activeCenterY + controlOffset}, ${targetCenterX} ${targetCenterY - controlOffset}, ${targetCenterX} ${targetCenterY}`;

          return (
            <path
              key={relationship.id}
              d={path}
              className="relationship-edge"
              data-type={relationship.type}
              data-explicitness={relationship.explicitness}
              data-state={relationship.state}
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
          title={`${getRelationshipStateLabel(relationship)} · ${relationship.explanation}`}
          data-type={relationship.type}
          data-explicitness={relationship.explicitness}
          data-state={relationship.state}
          style={{ transform: `translate(${note.x + 95}px, ${note.y + 44}px)` }}
          onClick={() => onTraverse(note.id, relationship.id)}
        >
          {getCompactDisplayTitle(note, 36)}
        </button>
      ))}
    </div>
  );
}
