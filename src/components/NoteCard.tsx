import { PointerEvent } from 'react';
import { getCompactDisplayTitle, getSummaryPreview } from '../noteText';
import { describeNoteTrace, getTraceVisualBias } from '../trace';
import { NoteCardModel } from '../types';

type NoteCardProps = {
  note: NoteCardModel;
  recentlyClosed: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
};

export function NoteCard({ note, recentlyClosed, onPointerDown, onPointerUp }: NoteCardProps) {
  const bias = getTraceVisualBias(note);
  const displayTitle = getCompactDisplayTitle(note);
  const summaryPreview = getSummaryPreview(note, 82);

  return (
    <article
      className="note-card"
      data-recent={recentlyClosed}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      data-trace={note.trace}
      data-focus={note.inFocus ? 'true' : 'false'}
      style={{
        transform: `translate(${note.x}px, ${note.y - bias.lift}px) scale(${bias.scale})`,
        zIndex: note.z,
        opacity: bias.opacity,
        filter: `blur(${bias.blur}px)`,
        boxShadow: `0 12px 28px rgba(2, 4, 9, ${0.08 + bias.emphasis * 0.2})`
      }}
    >
      <h3 title={displayTitle}>{displayTitle}</h3>
      <p className="summary-preview">{summaryPreview}</p>
      <p className="trace">{describeNoteTrace(note)}</p>
    </article>
  );
}
