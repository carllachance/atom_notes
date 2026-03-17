import { Note } from '../../models/note';
import { CardPosition } from '../../models/workspace';
import { NoteCard } from './NoteCard';

type Props = {
  notes: Note[];
  positions: Record<string, CardPosition>;
  onOpen: (id: string) => void;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
};

export const SpatialCanvas = ({ notes, positions, onOpen, onPin, onArchive, onDrag }: Props) => (
  <div className="spatial-canvas">
    {notes.map((note, index) => (
      <NoteCard
        key={note.id}
        note={note}
        position={positions[note.id] ?? { x: 90 + index * 30, y: 140 + index * 20 }}
        onOpen={() => onOpen(note.id)}
        onPin={() => onPin(note.id)}
        onArchive={() => onArchive(note.id)}
        onDrag={(x, y) => onDrag(note.id, x, y)}
      />
    ))}
  </div>
);
