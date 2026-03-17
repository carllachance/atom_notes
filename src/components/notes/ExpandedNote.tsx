import { Note } from '../../models/note';

type Props = {
  note: Note;
  onClose: () => void;
  onUpdate: (value: string) => void;
};

export const ExpandedNote = ({ note, onClose, onUpdate }: Props) => {
  const text = note.blocks[0]?.type === 'text' ? note.blocks[0].text : '';

  return (
    <div className="expanded-note">
      <div className="expanded-head">
        <strong>{note.title}</strong>
        <button onClick={onClose}>Close</button>
      </div>
      <textarea value={text} onChange={(event) => onUpdate(event.target.value)} />
    </div>
  );
};
