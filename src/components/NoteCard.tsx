import { PointerEvent } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { getProjectNoteVisual } from '../relationships/relationshipVisuals';
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
  projectState: 'none' | 'member' | 'subordinate';
  activeProjectLabel: string | null;
  activeProjectColor: string | null;
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
  recentlyClosed,
  ambientRelated,
  ambientPulse,
  ambientGlowLevel,
  revealMatched,
  revealActive,
  isActive,
  isHovered,
  projectState,
  activeProjectLabel,
  activeProjectColor,
  onPointerDown,
  onPointerUp,
  onPointerEnter,
  onPointerLeave
}: NoteCardProps) {
  const bias = getTraceVisualBias(note);
  const projectVisual = getProjectNoteVisual(projectState);
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
      data-project-state={projectState}
      style={{
        transform: `translate(${note.x}px, ${note.y - bias.lift}px) scale(${bias.scale * projectVisual.scaleMultiplier})`,
        transformOrigin: 'top left',
        zIndex: note.z,
        opacity: bias.opacity * projectVisual.opacityMultiplier,
        filter: `blur(${bias.blur}px)`,
        ['--ambient-glow-level' as string]: ambientRelated ? ambientGlowLevel.toFixed(3) : '0',
        ['--project-accent' as string]: activeProjectColor ?? 'rgba(122, 162, 247, 0.42)',
        ['--project-glow-strength' as string]: String(projectVisual.glowStrength)
      }}
    >
      {projectState === 'member' && activeProjectLabel ? <span className="project-badge">{activeProjectLabel}</span> : null}
      <h3 title={displayTitle}>{displayTitle}</h3>
      <p className="summary-preview">{summaryPreview}</p>
      <p className="trace">{describeNoteTrace(note)}</p>
    </article>
  );
}
