import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MarkdownProjectionView } from './MarkdownProjectionView';
import { getCompactDisplayTitle } from '../noteText';
import { NoteCardModel, RelationshipType } from '../types';

type VisibleRelationship = {
  id: string;
  targetId: string;
  targetTitle: string;
  targetContextLabel: string;
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
  onOpenRelated: (targetNoteId: string, relationshipId: string) => void;
  onCreateExplicitLink: (fromId: string, toId: string, type: RelationshipType) => void;
  onConfirmRelationship: (relationshipId: string) => void;
  onToggleFocus: (id: string) => void;
};

type DragState = {
  dx: number;
  dy: number;
};

type BodyMode = 'read' | 'edit';

function normalizeCommaSeparatedList(value: string): string[] {
  return [...new Set(value.split(',').map((part) => part.trim()).filter(Boolean))];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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
  onOpenRelated,
  onCreateExplicitLink,
  onConfirmRelationship,
  onToggleFocus
}: ExpandedNoteProps) {
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkType, setLinkType] = useState<RelationshipType>('related_concept');
  const [showLinkComposer, setShowLinkComposer] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bodyMode, setBodyMode] = useState<BodyMode>('read');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  const linkableNotes = useMemo(() => {
    if (!note) return [];
    return notes.filter((candidate) => candidate.id !== note.id && !candidate.archived);
  }, [note, notes]);

  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setDragState(null);
    setBodyMode('read');
    setShowLinkComposer(false);
    setLinkTargetId('');
  }, [note?.id]);

  useEffect(() => {
    if (!dragState || !panelRef.current) return;

    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const maxX = window.innerWidth / 2 - rect.width / 2 - 18;
      const minX = -maxX;
      const maxY = window.innerHeight / 2 - rect.height / 2 - 18;
      const minY = -maxY;

      setPosition({
        x: clamp(event.clientX - dragState.dx, minX, maxX),
        y: clamp(event.clientY - dragState.dy, minY, maxY)
      });
    };

    const onPointerUp = () => setDragState(null);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState]);

  if (!note) return null;

  return (
    <section className="expanded-note-shell">
      <aside
        ref={panelRef}
        className="expanded-note"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <header
          className="expanded-note-header"
          onPointerDown={(event: PointerEvent<HTMLElement>) => {
            const target = event.target as HTMLElement;
            if (target.closest('button')) return;
            event.preventDefault();
            setDragState({ dx: event.clientX - position.x, dy: event.clientY - position.y });
          }}
        >
          <strong title={getCompactDisplayTitle(note, 72)}>{getCompactDisplayTitle(note, 56)}</strong>
          <button className="ghost-button" onClick={onClose}>
            Back to canvas
          </button>
        </header>

        <div className="relationship-strip">
          <button
            className={activeFilter === 'related_concept' ? 'active' : ''}
            onMouseEnter={() => onSetFilter('related_concept')}
            onMouseLeave={() => onSetFilter('all')}
            onClick={() => onSetFilter(activeFilter === 'related_concept' ? 'all' : 'related_concept')}
          >
            Related <span>{relationshipTotals.related}</span>
          </button>
          <button
            className={activeFilter === 'references' ? 'active' : ''}
            onMouseEnter={() => onSetFilter('references')}
            onMouseLeave={() => onSetFilter('all')}
            onClick={() => onSetFilter(activeFilter === 'references' ? 'all' : 'references')}
          >
            References <span>{relationshipTotals.references}</span>
          </button>
        </div>

        <input
          aria-label="Note title"
          value={note.title ?? ''}
          onChange={(event) => onChange(note.id, { title: event.target.value })}
        />

        <div className="scope-editor">
          <label>
            <span>Workspace</span>
            <input
              aria-label="Note workspace"
              value={note.workspaceId ?? ''}
              placeholder="Optional origin workspace"
              onChange={(event) => {
                const workspaceId = event.target.value.trim();
                onChange(note.id, { workspaceId: workspaceId || null });
              }}
            />
          </label>
          <label>
            <span>Shared in</span>
            <input
              aria-label="Note workspace affinities"
              value={note.workspaceAffinities.join(', ')}
              placeholder="Optional additional scopes"
              onChange={(event) =>
                onChange(note.id, { workspaceAffinities: normalizeCommaSeparatedList(event.target.value) })
              }
            />
          </label>
          <label>
            <span>Projects</span>
            <input
              aria-label="Note projects"
              value={note.projectIds.join(', ')}
              placeholder="Comma-separated project ids"
              onChange={(event) => onChange(note.id, { projectIds: normalizeCommaSeparatedList(event.target.value) })}
            />
          </label>
        </div>

        <div className="body-mode-switch" role="tablist" aria-label="Note body mode">
          <button
            role="tab"
            aria-selected={bodyMode === 'read'}
            className={bodyMode === 'read' ? 'active' : ''}
            onClick={() => setBodyMode('read')}
          >
            Read
          </button>
          <button
            role="tab"
            aria-selected={bodyMode === 'edit'}
            className={bodyMode === 'edit' ? 'active' : ''}
            onClick={() => setBodyMode('edit')}
          >
            Edit
          </button>
        </div>

        {bodyMode === 'read' ? (
          <MarkdownProjectionView source={note.body} />
        ) : (
          <textarea
            aria-label="Note body markdown"
            value={note.body}
            onChange={(event) => onChange(note.id, { body: event.target.value })}
          />
        )}

        <section className="relations-list" aria-label="Relations">
          {relationships.length ? (
            relationships.map((relationship) => (
              <div key={relationship.id} className="relation-row">
                <button className="relation-main" onClick={() => onOpenRelated(relationship.targetId, relationship.id)}>
                  <span className="relation-title">{relationship.targetTitle}</span>
                  <small>
                    {relationship.type === 'references' ? 'Reference' : 'Related'} · {relationship.targetContextLabel} ·{' '}
                    {relationship.explicitness === 'inferred' ? relationship.explanation : 'Explicit link'}
                  </small>
                </button>
                {relationship.explicitness === 'inferred' && relationship.state === 'proposed' ? (
                  <button className="relation-confirm" onClick={() => onConfirmRelationship(relationship.id)}>
                    Confirm
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="relations-empty">No relationships yet.</p>
          )}
        </section>

        <div className="link-compose">
          <button className="ghost-button" onClick={() => setShowLinkComposer((open) => !open)}>
            {showLinkComposer ? 'Close link tools' : 'Link note'}
          </button>
          {showLinkComposer ? (
            <div className="link-row">
              <select value={linkTargetId} onChange={(event) => setLinkTargetId(event.target.value)}>
                <option value="">Select a note…</option>
                {linkableNotes.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {getCompactDisplayTitle(candidate)}
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
                  setShowLinkComposer(false);
                }}
              >
                Add
              </button>
            </div>
          ) : null}
        </div>

        <div className="expanded-actions">
          <button className="ghost-button" onClick={() => onToggleFocus(note.id)}>
            {note.inFocus ? 'Remove focus' : 'Mark focused'}
          </button>
          <button className="ghost-button" onClick={() => onArchive(note.id)}>
            Archive
          </button>
        </div>
      </aside>
    </section>
  );
}
