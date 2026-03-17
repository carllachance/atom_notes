import { PointerEvent } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { describeNoteTrace, getTraceVisualBias } from '../trace';
import { NoteCardModel } from '../types';

type NoteCardProps = {
  note: NoteCardModel;
  recentlyClosed: boolean;
  ambientRelated: boolean;
  ambientPulse: boolean;
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
  if (flags.ambientRelated) return 'ambient-related';
  if (note.inFocus) return 'focus';
  if (flags.isHovered) return 'hover';
  return 'default';
}

export function NoteCard({
  note,
  recentlyClosed,
  ambientRelated,
  ambientPulse,
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
      style={{
        transform: `translate(${note.x}px, ${note.y - bias.lift}px) scale(${bias.scale})`,
        zIndex: note.z,
        opacity: bias.opacity,
        filter: `blur(${bias.blur}px)`
      }}
    >
      <h3 title={displayTitle}>{displayTitle}</h3>
      <p className="summary-preview">{summaryPreview}</p>
      <p className="trace">{describeNoteTrace(note)}</p>
    </article>
  );
}
