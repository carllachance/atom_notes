import { useMemo, useState } from 'react';
import { NoteCardModel, RelationshipType } from '../types';

type VisibleRelationship = {
  id: string;
  targetId: string;
  targetTitle: string;
  type: RelationshipType;
  explicitness: 'explicit' | 'inferred';
  state: 'proposed' | 'confirmed';
  explanation: string;
  heuristicSupported: boolean;
};

type ExpandedNoteProps = {
  note: NoteCardModel | null;
  notes: NoteCardModel[];
  relationships: VisibleRelationship[];
  relationshipTotals: { related: number; references: number };
  activeFilter: 'all' | RelationshipType;
  onSetFilter: (filter: 'all' | RelationshipType) => void;
  onClose: () => void;
  onArchive: (id: string) => void;
  onChange: (id: string, updates: Partial<NoteCardModel>) => void;
  onCreateExplicitLink: (fromId: string, toId: string, type: RelationshipType) => void;
  onConfirmRelationship: (relationshipId: string) => void;
};

export function ExpandedNote({
  note,
  notes,
  relationships,
  relationshipTotals,
  activeFilter,
  onSetFilter,
  onClose,
  onArchive,
  onChange,
  onCreateExplicitLink,
  onConfirmRelationship
}: ExpandedNoteProps) {
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkType, setLinkType] = useState<RelationshipType>('related_concept');

  const linkableNotes = useMemo(() => {
    if (!note) return [];
    return notes.filter((candidate) => candidate.id !== note.id && !candidate.archived);
  }, [note, notes]);

  if (!note) return null;

  return (
    <section className="expanded-note-shell">
      <aside className="expanded-note">
        <div className="relationship-strip">
          <button
            className={activeFilter === 'related_concept' ? 'active' : ''}
            onMouseEnter={() => onSetFilter('related_concept')}
            onMouseLeave={() => onSetFilter('all')}
            onClick={() => onSetFilter(activeFilter === 'related_concept' ? 'all' : 'related_concept')}
          >
            Related {relationshipTotals.related}
          </button>
          <button
            className={activeFilter === 'references' ? 'active' : ''}
            onMouseEnter={() => onSetFilter('references')}
            onMouseLeave={() => onSetFilter('all')}
            onClick={() => onSetFilter(activeFilter === 'references' ? 'all' : 'references')}
          >
            References {relationshipTotals.references}
          </button>
        </div>

        <input
          aria-label="Note title"
          value={note.title}
          onChange={(event) => onChange(note.id, { title: event.target.value })}
        />
        <textarea
          aria-label="Note body"
          value={note.body}
          onChange={(event) => onChange(note.id, { body: event.target.value })}
        />

        <div className="link-row">
          <select value={linkTargetId} onChange={(event) => setLinkTargetId(event.target.value)}>
            <option value="">Link to note…</option>
            {linkableNotes.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
          <select value={linkType} onChange={(event) => setLinkType(event.target.value as RelationshipType)}>
            <option value="related_concept">Related</option>
            <option value="references">References</option>
          </select>
          <button
            onClick={() => {
              if (!linkTargetId) return;
              onCreateExplicitLink(note.id, linkTargetId, linkType);
              setLinkTargetId('');
            }}
          >
            Link
          </button>
        </div>

        <div className="inferred-list">
          {relationships
            .filter((relationship) => relationship.explicitness === 'inferred')
            .map((relationship) => (
              <div key={relationship.id} className="inferred-item">
                <p>
                  {relationship.targetTitle} · {relationship.explanation}
                  {relationship.state === 'confirmed' && !relationship.heuristicSupported
                    ? ' (stale: no longer supported by current heuristic)'
                    : ''}
                </p>
                {relationship.state === 'proposed' ? (
                  <button onClick={() => onConfirmRelationship(relationship.id)}>Confirm</button>
                ) : relationship.heuristicSupported ? (
                  <span>Confirmed</span>
                ) : (
                  <span>Confirmed · stale</span>
                )}
              </div>
            ))}
        </div>

        <div className="expanded-actions">
          <button className="ghost-button" onClick={() => onArchive(note.id)}>
            Archive
          </button>
          <button className="ghost-button" onClick={onClose}>
            Back to canvas
          </button>
        </div>
      </aside>
    </section>
  );
}
