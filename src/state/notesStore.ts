import { Note } from '../models/note';
import { TextBlock } from '../models/blocks';
import { createId } from '../utils/ids';
import { nowIso } from '../utils/time';

const makeTextBlock = (text: string): TextBlock => ({ id: createId(), type: 'text', text });

export const createNote = (text: string): Note => {
  const now = nowIso();
  return {
    id: createId(),
    title: text.slice(0, 48) || 'Untitled note',
    blocks: [makeTextBlock(text)],
    createdAt: now,
    updatedAt: now,
    archived: false,
    pinned: false,
    lastInteractionText: text || 'Captured note',
    lastInteractionType: 'note',
    lastInteractionTime: now,
  };
};

export const updateNoteText = (note: Note, text: string): Note => {
  const now = nowIso();
  return {
    ...note,
    title: text.split('\n')[0].slice(0, 48) || note.title,
    blocks: [{ id: note.blocks[0]?.id ?? createId(), type: 'text', text }],
    updatedAt: now,
    lastInteractionText: 'Edited note',
    lastInteractionType: 'text',
    lastInteractionTime: now,
  };
};
