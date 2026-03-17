import { PointerEvent } from 'react';
import { AnchorRow } from './AnchorRow';
import { NoteCardModel } from '../types';

type NoteCardProps = {
  note: NoteCardModel;
  onPointerDown: (event: PointerEvent<HTMLArticleElement>) => void;
  onOpen: () => void;
};

export function NoteCard({ note, onPointerDown, onOpen }: NoteCardProps) {
  return (
    <article
      className="note-card"
      onDoubleClick={onOpen}
      onPointerDown={onPointerDown}
      style={{ transform: `translate(${note.x}px, ${note.y}px)`, zIndex: note.z }}
    >
      <h3>{note.title}</h3>
      <p>{note.body.slice(0, 140) || 'Empty note'}</p>
      <AnchorRow anchors={note.anchors} />
    </article>
  );
}
