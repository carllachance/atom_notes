import { useMemo, useState } from 'react';
import { getCompactDisplayTitle } from '../noteText';
import { getRelationshipTargetNoteId } from '../relationshipLogic';
import { getSemanticRelationshipVisual } from '../relationships/relationshipVisuals';
import { NoteCardModel, RelationshipType } from '../types';
import { FocusLensRelatedNote } from '../scene/focusLens';
import {
  CanvasViewportMetrics,
  getNoteCenter,
  getRelatedNodeStyle,
  getRelationshipWebPlaneStyle
} from './relationshipWebGeometry';
import { computeArcPath, computeRelationshipVisualProps } from '../utils/arcPath';
import { recordTraversal, useTraversalHistory } from '../store/sessionSlice';

type RelationshipWebProps = {
  activeNote: NoteCardModel;
  notes: NoteCardModel[];
  relatedNotes: FocusLensRelatedNote[];
  filter: 'all' | RelationshipType;
  canvasMetrics: CanvasViewportMetrics | null;
  hoveredNoteId: string | null;
  onInspectRelationship: (relationshipId: string) => void;
  onOpenRelated: (targetNoteId: string, relationshipId: string) => void;
  onHoverRelatedNote: (noteId: string) => void;
  onClearRelatedHover: (noteId: string) => void;
};

export function RelationshipWeb({ activeNote, notes, relatedNotes, filter, canvasMetrics, hoveredNoteId, onInspectRelationship, onOpenRelated, onHoverRelatedNote, onClearRelatedHover }: RelationshipWebProps) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const [localHoveredNoteId, setLocalHoveredNoteId] = useState<string | null>(null);

  const visibleTargets = useMemo(() => {
    const filtered = relatedNotes.filter((item) => item.degree === 1 && (filter === 'all' || item.relationship.type === filter));

    return filtered
      .slice(0, 10)
      .map((item) => {
        const targetId = getRelationshipTargetNoteId(item.relationship, activeNote.id);
        const target = notesById.get(targetId);
        if (!target) return null;
        return { relationship: item.relationship, target, score: item.score };
      })
      .filter((item): item is { relationship: FocusLensRelatedNote['relationship']; target: NoteCardModel; score: number } => Boolean(item));
  }, [activeNote.id, filter, notesById, relatedNotes]);
  const emphasis = filter === 'all' ? 'default' : 'selected';
  const emphasizedTargetId = localHoveredNoteId ?? hoveredNoteId;
  const hoverActive = visibleTargets.some(({ target }) => target.id === emphasizedTargetId);
  const traversalHistory = useTraversalHistory();

  // Build a lookup of note positions for trail rendering
  const notePositionsById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const note of notes) {
      map.set(note.id, getNoteCenter(note));
    }
    return map;
  }, [notes]);

  return (
    <div className="relationship-web-layer" data-hover-active={hoverActive ? 'true' : 'false'}>
      <div className="relationship-web-plane" style={getRelationshipWebPlaneStyle(canvasMetrics)}>
        <svg className="relationship-web" aria-hidden="false" style={{ pointerEvents: 'none' }}>
          {/* Layer 1: Memory trail arcs — rendered beneath relationship arcs */}
          {traversalHistory.map((entry, index) => {
            const fromPos = notePositionsById.get(entry.fromNoteId);
            const toPos = notePositionsById.get(entry.toNoteId);
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
          {/* Layer 2: Relationship arcs */}
          {visibleTargets.map(({ relationship, target }) => {
            const isHovered = emphasizedTargetId === target.id;
            const fromPt = getNoteCenter(activeNote);
            const toPt = getNoteCenter(target);
            const arcVisual = computeRelationshipVisualProps({
              type: relationship.type,
              explicitness: relationship.explicitness,
              lifecycle_state: relationship.state === 'confirmed' ? 'active' : 'proposed',
              reinforcement_score: relationship.confidence ?? 0.5,
            });
            const arcPath = computeArcPath(fromPt, toPt, 0.18);
            const isFiltered = filter !== 'all';
            const matchesFilter = filter === relationship.type;
            const finalOpacity = isFiltered
              ? (matchesFilter ? arcVisual.opacity : 0.04)
              : hoverActive
                ? (isHovered ? Math.min(arcVisual.opacity * 1.4, 1.0) : 0.04)
                : arcVisual.opacity;
            const finalStrokeWidth = isHovered ? arcVisual.strokeWidth * 1.5 : arcVisual.strokeWidth;

            // Compute midpoint for hover label (approximate control point)
            const midX = (fromPt.x + toPt.x) / 2;
            const midY = (fromPt.y + toPt.y) / 2;

            return (
              <g key={relationship.id}>
                <path
                  d={arcPath}
                  stroke={arcVisual.color}
                  strokeWidth={finalStrokeWidth}
                  strokeDasharray={arcVisual.strokeDasharray || undefined}
                  opacity={finalOpacity}
                  fill="none"
                  strokeLinecap="round"
                  style={{
                    transition: 'opacity var(--transition-base), stroke-width var(--transition-fast)',
                    pointerEvents: 'stroke',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => {
                    setLocalHoveredNoteId(target.id);
                    onHoverRelatedNote(target.id);
                  }}
                  onMouseLeave={() => {
                    setLocalHoveredNoteId((current) => (current === target.id ? null : current));
                    onClearRelatedHover(target.id);
                  }}
                  onClick={() => onInspectRelationship(relationship.id)}
                />
                {isHovered && (
                  <text
                    x={midX}
                    y={midY - 6}
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    fontSize={10}
                    fontFamily="var(--font-stack)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {relationship.explanation || relationship.type.replace(/_/g, ' ')}
                  </text>
                )}
              </g>
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
              onMouseEnter={() => {
                setLocalHoveredNoteId(note.id);
                onHoverRelatedNote(note.id);
              }}
              onMouseLeave={() => {
                setLocalHoveredNoteId((current) => (current === note.id ? null : current));
                onClearRelatedHover(note.id);
              }}
              onClick={() => {
                recordTraversal(activeNote.id, note.id);
                onOpenRelated(note.id, relationship.id);
              }}
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
