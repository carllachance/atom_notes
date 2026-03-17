import { PointerEvent } from 'react';
import { describeNoteTrace, getTraceVisualBias } from '../trace';
import { NoteCardModel } from '../types';

type NoteCardProps = {
  note: NoteCardModel;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
};

export function NoteCard({ note, onPointerDown, onPointerUp }: NoteCardProps) {
  const bias = getTraceVisualBias(note);

  return (
    <article
      className="note-card"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      data-trace={note.trace}
      style={{
        transform: `translate(${note.x}px, ${note.y - bias.lift}px) scale(${bias.scale})`,
        zIndex: note.z,
        opacity: bias.opacity,
        filter: `blur(${bias.blur}px)`,
        boxShadow: `0 12px 28px rgba(2, 4, 9, ${0.08 + bias.emphasis * 0.2})`
      }}
    >
      <h3>{note.title}</h3>
      <p className="trace">{describeNoteTrace(note)}</p>
      <p className="state-cue">{note.stateCue}</p>
    </article>
  );
}
