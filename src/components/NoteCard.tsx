import { PointerEvent } from 'react';
import { describeNoteTrace, getTraceVisualBias } from '../trace';
import { NoteCardModel } from '../types';

type NoteCardProps = {
  note: NoteCardModel;
  onPointerDown: (event: PointerEvent<HTMLArticleElement>) => void;
  onOpen: () => void;
};

export function NoteCard({ note, onPointerDown, onOpen }: NoteCardProps) {
  const bias = getTraceVisualBias(note);

  return (
    <article
      className="note-card"
      onDoubleClick={onOpen}
      onPointerDown={onPointerDown}
      data-trace={note.trace}
      style={{
        transform: `translate(${note.x}px, ${note.y}px) scale(${bias.scale})`,
        zIndex: note.z,
        opacity: bias.opacity,
        boxShadow: `0 8px 20px rgba(2, 4, 9, ${0.12 + bias.emphasis * 0.22})`
      }}
    >
      <h3>{note.title}</h3>
      <p className="trace">{describeNoteTrace(note)}</p>
      <p className="state-cue">{note.stateCue}</p>
    </article>
  );
}
