import { memo, PointerEvent } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { getProjectNoteVisual } from '../relationships/relationshipVisuals';
import { describeNoteTrace, getTraceVisualBias } from '../trace';
import { NoteCardModel } from '../types';
import { LensNotePresentation } from '../scene/lens';

type NoteCardProps = {
  note: NoteCardModel;
  position: { x: number; y: number } | null;
  meta?: LensNotePresentation;
  focusHighlightEnabled: boolean;
  focusModeActive: boolean;
  recentlyClosed: boolean;
  ambientRelated: boolean;
  ambientPulse: boolean;
  ambientGlowLevel: number;
  isDragging: boolean;
  isDirectlyDragging: boolean;
  revealMatched: boolean;
  revealActive: boolean;
  isActive: boolean;
  isHovered: boolean;
  activeProjectLabel: string | null;
  activeProjectColor: string | null;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

function getVisualState(note: NoteCardModel, focusHighlightEnabled: boolean, flags: { isActive: boolean; revealActive: boolean; ambientPulse: boolean; ambientGlowLevel: number; recentlyClosed: boolean; revealMatched: boolean; ambientRelated: boolean; isHovered: boolean; }) {
  const isFocus = Boolean(note.isFocus ?? note.inFocus);
  if (note.archived) return 'archived';
  if (flags.isActive) return 'active';
  if (flags.revealActive) return 'reveal-active';
  if (flags.ambientPulse) return 'pulse';
  if (flags.recentlyClosed) return 'recent';
  if (flags.revealMatched) return 'reveal-match';
  if (flags.ambientRelated && flags.ambientGlowLevel > 0.01) return 'ambient-related';
  if (focusHighlightEnabled && isFocus) return 'focus-highlight';
  if (isFocus) return 'focus';
  if (flags.isHovered) return 'hover';
  return 'default';
}

function formatIntentLabel(intent: NoteCardModel['intent']) {
  return intent ? intent.toUpperCase() : null;
}

function NoteCardComponent({ note, position, meta, focusHighlightEnabled, focusModeActive, recentlyClosed, ambientRelated, ambientPulse, ambientGlowLevel, isDragging, isDirectlyDragging, revealMatched, revealActive, isActive, isHovered, activeProjectLabel, activeProjectColor, onPointerDown, onPointerUp, onPointerEnter, onPointerLeave }: NoteCardProps) {
  const bias = getTraceVisualBias(note);
  const projectVisual = getProjectNoteVisual(meta?.projectState === 'member' ? 'member' : meta?.surfaced ? 'subordinate' : 'none');
  const displayTitle = getCompactDisplayTitle(note);
  const summaryPreview = getSummaryPreview(note, 82);
  const visualState = getVisualState(note, focusHighlightEnabled, { isActive, revealActive, ambientPulse, ambientGlowLevel, recentlyClosed, revealMatched, ambientRelated, isHovered });
  const emphasisScale = meta?.emphasis === 'supporting' ? 0.985 : 1;
  const emphasisOpacity = meta?.emphasis === 'supporting' ? 0.84 : 1;
  const dragScale = isDirectlyDragging ? 1.02 : isDragging ? 1.008 : 1;
  const isFocus = Boolean(note.isFocus ?? note.inFocus);
  const resolvedPosition = position ?? { x: note.x, y: note.y };
  const intentLabel = formatIntentLabel(note.intent);
  const focusOpacity = focusModeActive && !isFocus ? 0.62 : 1;

  return (
    <article
      className="note-card"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      data-trace={note.trace}
      data-focus={isFocus ? 'true' : 'false'}
      data-visual-state={visualState}
      data-project-state={meta?.projectState ?? 'none'}
      data-project-selection={activeProjectColor ? 'active' : 'idle'}
      data-project-affinity={meta?.projectAccent ? 'tinted' : 'none'}
      data-workspace-state={meta?.workspaceState ?? 'none'}
      data-emphasis={meta?.emphasis ?? 'context'}
      data-dragging={isDragging ? 'true' : 'false'}
      data-direct-dragging={isDirectlyDragging ? 'true' : 'false'}
      style={{
        transform: `translate(${resolvedPosition.x}px, ${resolvedPosition.y - bias.lift - (isDirectlyDragging ? 6 : isDragging ? 2 : 0)}px) scale(${bias.scale * projectVisual.scaleMultiplier * emphasisScale * dragScale})`,
        transformOrigin: 'top left',
        zIndex: note.z,
        opacity: bias.opacity * projectVisual.opacityMultiplier * emphasisOpacity * focusOpacity,
        filter: `blur(${bias.blur}px)`,
        ['--ambient-glow-level' as string]: ambientRelated ? ambientGlowLevel.toFixed(3) : '0',
        ['--project-accent' as string]: meta?.projectAccent ?? activeProjectColor ?? 'rgba(122, 162, 247, 0.42)',
        ['--project-glow-strength' as string]: String(projectVisual.glowStrength),
        transition: isDragging
          ? 'opacity 160ms ease, box-shadow 180ms ease, border-color 180ms ease, filter 180ms ease, background 180ms ease'
          : undefined,
        animation: isDragging ? 'none' : undefined
      }}
    >
      <div className="note-card-meta">
        {isFocus ? <span className="note-meta-token note-meta-token--focus">Focus</span> : null}
        {intentLabel ? <span className="note-meta-token">{intentLabel}</span> : null}
        {meta?.projectState === 'member' && activeProjectLabel ? <span className="note-meta-token note-meta-token--project">{activeProjectLabel}</span> : null}
        {meta?.contextLabel ? <span className="note-meta-context">{meta.contextLabel}</span> : null}
      </div>
      <h3 title={displayTitle}>{displayTitle}</h3>
      <p className={`note-workspace-label ${meta?.workspaceState === 'orphan' ? 'is-empty' : ''}`}>{meta?.workspaceLabel ?? 'No workspace assigned'}</p>
      <p className="summary-preview">{summaryPreview}</p>
      <p className="trace">{describeNoteTrace(note)}</p>
    </article>
  );
}

export const NoteCard = memo(NoteCardComponent, (prev, next) => {
  return (
    prev.note === next.note &&
    prev.position?.x === next.position?.x &&
    prev.position?.y === next.position?.y &&
    prev.meta?.emphasis === next.meta?.emphasis &&
    prev.meta?.surfaced === next.meta?.surfaced &&
    prev.meta?.revealed === next.meta?.revealed &&
    prev.meta?.projectState === next.meta?.projectState &&
    prev.meta?.projectAccent === next.meta?.projectAccent &&
    prev.meta?.workspaceState === next.meta?.workspaceState &&
    prev.meta?.contextLabel === next.meta?.contextLabel &&
    prev.focusHighlightEnabled === next.focusHighlightEnabled &&
    prev.focusModeActive === next.focusModeActive &&
    prev.recentlyClosed === next.recentlyClosed &&
    prev.ambientRelated === next.ambientRelated &&
    prev.ambientPulse === next.ambientPulse &&
    prev.ambientGlowLevel === next.ambientGlowLevel &&
    prev.isDragging === next.isDragging &&
    prev.isDirectlyDragging === next.isDirectlyDragging &&
    prev.revealMatched === next.revealMatched &&
    prev.revealActive === next.revealActive &&
    prev.isActive === next.isActive &&
    prev.isHovered === next.isHovered &&
    prev.activeProjectLabel === next.activeProjectLabel &&
    prev.activeProjectColor === next.activeProjectColor
  );
});
