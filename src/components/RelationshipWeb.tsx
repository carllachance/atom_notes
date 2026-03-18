import { useMemo } from 'react';
import { getCompactDisplayTitle } from '../noteText';
import { NoteCardModel, Relationship, RelationshipType } from '../types';
import {
  buildProjectGroups,
  buildVisibleRelationshipProjectMap,
  getProjectGroupPresentation,
  getRelationshipEdgePresentation,
  getRelationshipTargetIdForVisual
} from '../relationships/relationshipVisuals';

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

type VisibleEdge = {
  relationship: Relationship;
  target: NoteCardModel;
  score: number;
};

const NOTE_CARD_WIDTH = 270;
const NOTE_CARD_HEIGHT = 124;

export function RelationshipWeb({ activeNote, notes, rankedRelationships, filter, onTraverse }: RelationshipWebProps) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  const visibleEdges = useMemo(() => {
    const filtered = rankedRelationships.filter(
      (item) => filter === 'all' || item.relationship.type === filter
    );

    return filtered
      .slice(0, 10)
      .map((item) => {
        const targetId = getRelationshipTargetIdForVisual(item.relationship, activeNote.id);
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
  const projectGroups = useMemo(() => buildProjectGroups(activeNote, visibleTargets), [activeNote, visibleTargets]);
  const relationshipProjectMap = useMemo(() => buildVisibleRelationshipProjectMap(activeNote, visibleTargets), [activeNote, visibleTargets]);
  const activeCenterX = activeNote.x + NOTE_CARD_WIDTH / 2;
  const activeCenterY = activeNote.y + NOTE_CARD_HEIGHT / 2;
  const projectGroupPresentation = getProjectGroupPresentation();

  return (
    <div className="relationship-web-layer">
      <svg className="relationship-web" viewBox="0 0 1800 1100" preserveAspectRatio="none" aria-hidden="true">
        {projectGroups.map((group) => (
          <g key={group.id} className="relationship-project-group" data-visual-kind="project">
            <rect
              x={group.bounds.x}
              y={group.bounds.y}
              width={group.bounds.width}
              height={group.bounds.height}
              rx={46}
              className="relationship-project-hull"
              fill={projectGroupPresentation.fill}
              fillOpacity={projectGroupPresentation.fillOpacity}
              stroke={projectGroupPresentation.stroke}
              strokeOpacity={projectGroupPresentation.strokeOpacity}
              strokeWidth={projectGroupPresentation.strokeWidth}
              strokeDasharray={projectGroupPresentation.strokeDasharray}
            />
            <text
              x={group.bounds.x + 24}
              y={group.bounds.y + 24}
              className="relationship-project-label"
              fillOpacity={projectGroupPresentation.labelOpacity}
            >
              {group.label.toUpperCase()}
            </text>
          </g>
        ))}

        {visibleTargets.map(({ relationship, target, score }) => {
          const edgePresentation = getRelationshipEdgePresentation(relationship, { score });
          const targetCenterX = target.x + NOTE_CARD_WIDTH / 2;
          const targetCenterY = target.y + NOTE_CARD_HEIGHT / 2;
          const controlOffset = Math.max(30, Math.abs(targetCenterX - activeCenterX) * 0.18);
          const path = `M ${activeCenterX} ${activeCenterY} C ${activeCenterX} ${activeCenterY + controlOffset}, ${targetCenterX} ${targetCenterY - controlOffset}, ${targetCenterX} ${targetCenterY}`;

          return (
            <path
              key={relationship.id}
              d={path}
              className={`relationship-edge ${edgePresentation.motionClassName}`}
              data-type={relationship.type}
              data-explicitness={relationship.explicitness}
              data-visual-kind={edgePresentation.kind}
              stroke={edgePresentation.stroke}
              strokeOpacity={edgePresentation.strokeOpacity}
              strokeWidth={edgePresentation.strokeWidth}
              strokeDasharray={edgePresentation.strokeDasharray}
            />
          );
        })}
      </svg>

      {visibleTargets.map(({ target: note, relationship, score }) => {
        const edgePresentation = getRelationshipEdgePresentation(relationship, { score });
        const hasProject = relationshipProjectMap.get(relationship.id) ?? false;

        return (
          <button
            key={note.id}
            className="related-node"
            data-visual-kind={edgePresentation.kind}
            data-has-project={hasProject ? 'true' : 'false'}
            title={relationship.explanation}
            data-type={relationship.type}
            data-explicitness={relationship.explicitness}
            style={{
              transform: `translate(${note.x + 95}px, ${note.y + 44}px)`,
              ['--relationship-node-border-opacity' as string]: edgePresentation.nodeBorderOpacity.toFixed(3),
              ['--relationship-node-halo-opacity' as string]: edgePresentation.nodeHaloOpacity.toFixed(3)
            }}
            onClick={() => onTraverse(note.id, relationship.id)}
          >
            {getCompactDisplayTitle(note, 36)}
          </button>
        );
      })}
    </div>
  );
}
