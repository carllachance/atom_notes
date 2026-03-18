import { PointerEvent } from 'react';
import { CanvasVisualState } from '../canvas/visibility';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { describeNoteTrace, getTraceVisualBias } from '../trace';
import { NoteCardModel } from '../types';

type NoteCardProps = {
  note: NoteCardModel;
  worldOffsetX: number;
  worldOffsetY: number;
  visual: CanvasVisualState;
  recentlyClosed: boolean;
  ambientRelated: boolean;
  ambientPulse: boolean;
  ambientGlowLevel: number;
  revealMatched: boolean;
  revealActive: boolean;
  isActive: boolean;
  isHovered: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

function getVisualState(
  note: NoteCardModel,
  flags: {
    isActive: boolean;
    revealActive: boolean;
    ambientPulse: boolean;
    ambientGlowLevel: number;
    recentlyClosed: boolean;
    revealMatched: boolean;
    ambientRelated: boolean;
    isHovered: boolean;
  }
) {
  if (note.archived) return 'archived';
  if (flags.isActive) return 'active';
  if (flags.revealActive) return 'reveal-active';
  if (flags.ambientPulse) return 'pulse';
  if (flags.recentlyClosed) return 'recent';
  if (flags.revealMatched) return 'reveal-match';
  if (flags.ambientRelated && flags.ambientGlowLevel > 0.01) return 'ambient-related';
  if (note.inFocus) return 'focus';
  if (flags.isHovered) return 'hover';
  return 'default';
}

export function NoteCard({
  note,
  worldOffsetX,
  worldOffsetY,
  visual,
  recentlyClosed,
  ambientRelated,
  ambientPulse,
  ambientGlowLevel,
  revealMatched,
  revealActive,
  isActive,
  isHovered,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerLeave
}: NoteCardProps) {
  const bias = getTraceVisualBias(note);
  const displayTitle = getCompactDisplayTitle(note);
  const summaryPreview = getSummaryPreview(note, visual.showSummary ? 82 : 54);
  const visualState = getVisualState(note, {
    isActive,
    revealActive,
    ambientPulse,
    ambientGlowLevel,
    recentlyClosed,
    revealMatched,
    ambientRelated,
    isHovered
  });

  return (
    <article
      className="note-card"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      data-trace={note.trace}
      data-focus={note.inFocus ? 'true' : 'false'}
      data-visual-state={visualState}
      data-stage={visual.stage}
      style={{
        transform: `translate(${note.x + worldOffsetX}px, ${note.y + worldOffsetY - bias.lift}px) scale(${bias.scale})`,
        zIndex: note.z,
        opacity: bias.opacity * visual.opacityMultiplier,
        filter: `blur(${bias.blur}px)`,
        ['--ambient-glow-level' as string]: ambientRelated ? ambientGlowLevel.toFixed(3) : '0'
      }}
    >
      <h3 title={displayTitle}>{displayTitle}</h3>
      {visual.showSummary ? <p className="summary-preview">{summaryPreview}</p> : null}
      {visual.showTrace ? <p className="trace">{describeNoteTrace(note)}</p> : null}
    </article>
  );
}
