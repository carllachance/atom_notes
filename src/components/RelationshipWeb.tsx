import { useMemo } from 'react';
import { getCompactDisplayTitle } from '../noteText';
import { NoteCardModel, Relationship, RelationshipType } from '../types';
import { getRelationshipTargetNoteId } from '../relationshipLogic';

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

export function RelationshipWeb({ activeNote, notes, rankedRelationships, filter: _filter, onTraverse }: RelationshipWebProps) {
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
