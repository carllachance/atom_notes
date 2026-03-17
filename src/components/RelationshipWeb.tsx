import { useMemo } from 'react';
import { getCompactDisplayTitle } from '../noteText';
import { NoteCardModel, Relationship, RelationshipType } from '../types';
import { getRelationshipExplanation, getRelationshipTargetNoteId } from '../relationshipLogic';

type RankedRelationship = {
  relationship: Relationship;
  score: number;
};

type RelationshipWebProps = {
  activeNote: NoteCardModel;
  notes: NoteCardModel[];
  rankedRelationships: RankedRelationship[];
  filter: 'all' | RelationshipType;
  onTraverse: (targetNoteId: string, relationshipId: string) => void;
};

const EDGE_COLORS: Record<RelationshipType, string> = {
  references: 'rgba(149, 124, 221, 0.45)',
  related_concept: 'rgba(107, 158, 234, 0.42)'
};

export function RelationshipWeb({ activeNote, notes, rankedRelationships, filter, onTraverse }: RelationshipWebProps) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  const visibleEdges = rankedRelationships.slice(0, 10);
  const dedupedTargetIds = Array.from(
    new Set(visibleEdges.map((item) => getRelationshipTargetNoteId(item.relationship, activeNote.id)))
  ).slice(0, 8);

  const visibleTargets = dedupedTargetIds
    .map((id) => notesById.get(id))
    .filter((note): note is NoteCardModel => Boolean(note));

  return (
    <div className="relationship-web-layer">
      <svg className="relationship-web" viewBox="0 0 1800 1100" preserveAspectRatio="none">
        {visibleEdges.map(({ relationship }) => {
          const targetId = getRelationshipTargetNoteId(relationship, activeNote.id);
          const target = notesById.get(targetId);
          if (!target) return null;

          const activeFilter = filter === 'all' || filter === relationship.type;
          const dimBecauseProposed = relationship.state === 'proposed' && relationship.explicitness === 'inferred';

          return (
            <line
              key={relationship.id}
              x1={activeNote.x + 135}
              y1={activeNote.y + 72}
              x2={target.x + 135}
              y2={target.y + 72}
              stroke={EDGE_COLORS[relationship.type]}
              strokeOpacity={activeFilter ? (dimBecauseProposed ? 0.22 : 0.36) : 0.08}
              strokeWidth={activeFilter ? 1.8 : 1.2}
              strokeDasharray={relationship.explicitness === 'explicit' ? '0' : '7 6'}
            >
              {relationship.explicitness === 'inferred' ? <title>{getRelationshipExplanation(relationship)}</title> : null}
            </line>
          );
        })}
      </svg>

      {visibleTargets.map((note) => (
        <button
          key={note.id}
          className="related-node"
          style={{ transform: `translate(${note.x + 95}px, ${note.y + 44}px)` }}
          onClick={() => {
            const relationship = visibleEdges.find(
              (item) => getRelationshipTargetNoteId(item.relationship, activeNote.id) === note.id
            );
            if (relationship) onTraverse(note.id, relationship.relationship.id);
          }}
        >
          {getCompactDisplayTitle(note, 36)}
        </button>
      ))}
    </div>
  );
}
