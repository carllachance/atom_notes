import { PointerEvent } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { describeNoteTrace, getTraceVisualBias } from '../trace';
import { LensNoteState } from '../scene/lens';
import { NoteCardModel } from '../types';

type NoteCardProps = {
  note: NoteCardModel;
  lensState?: LensNoteState;
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
  lensState,
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
  const summaryPreview = getSummaryPreview(note, 82);
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
      data-lens-emphasis={lensState?.emphasis ?? 'strong'}
      data-off-scope={lensState?.offScope ? 'true' : 'false'}
      style={{
        transform: `translate(${note.x}px, ${note.y - bias.lift}px) scale(${bias.scale})`,
        zIndex: note.z,
        opacity: bias.opacity,
        filter: `blur(${bias.blur}px)`,
        ['--ambient-glow-level' as string]: ambientRelated ? ambientGlowLevel.toFixed(3) : '0'
      }}
    >
      <h3 title={displayTitle}>{displayTitle}</h3>
      <p className="summary-preview">{summaryPreview}</p>
      {lensState?.contextLabel ? <p className="scope-cue">{lensState.contextLabel}</p> : null}
      <p className="trace">{describeNoteTrace(note)}</p>
    </article>
  );
}
