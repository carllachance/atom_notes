import { PointerEvent } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { describeNoteTrace, getTraceVisualBias } from '../trace';
import { NoteCardModel } from '../types';

type NoteCardProps = {
  note: NoteCardModel;
  recentlyClosed: boolean;
  ambientRelated: boolean;
  ambientPulse: boolean;
  ambientGlowLevel: number;
  revealMatched: boolean;
  revealActive: boolean;
  isActive: boolean;
  isHovered: boolean;
  projectState: 'member' | 'subdued' | 'idle';
  projectAccentColor: string | null;
  projectLabel: string | null;
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
    projectState: 'member' | 'subdued' | 'idle';
  }
) {
  if (note.archived) return 'archived';
  if (flags.isActive) return 'active';
  if (flags.projectState === 'member') return 'project-member';
  if (flags.projectState === 'subdued') return 'project-subdued';
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
  recentlyClosed,
  ambientRelated,
  ambientPulse,
  ambientGlowLevel,
  revealMatched,
  revealActive,
  isActive,
  isHovered,
  projectState,
  projectAccentColor,
  projectLabel,
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
    isHovered,
    projectState
  });

  const displayOpacity = projectState === 'subdued' ? bias.opacity * 0.72 : bias.opacity;

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
      data-project-state={projectState}
      title={projectLabel ? `${displayTitle} · ${projectLabel}` : displayTitle}
      style={{
        transform: `translate(${note.x}px, ${note.y - bias.lift}px) scale(${bias.scale})`,
        zIndex: note.z,
        opacity: displayOpacity,
        filter: `blur(${bias.blur}px)`,
        ['--ambient-glow-level' as string]: ambientRelated ? ambientGlowLevel.toFixed(3) : '0',
        ['--project-accent' as string]: projectAccentColor ?? 'rgba(137, 168, 255, 0.34)'
      }}
    >
      <h3 title={displayTitle}>{displayTitle}</h3>
      <p className="summary-preview">{summaryPreview}</p>
      <p className="trace">{describeNoteTrace(note)}</p>
    </article>
  );
}
