import { NoteCardModel, Lens } from '../types';

export function applyLens(notes: NoteCardModel[], lens: Lens): NoteCardModel[] {
  if (lens === 'archive') {
    return notes.filter((note) => note.archived);
  }

  if (lens === 'focus') {
    return notes.filter((note) => !note.archived && Boolean(note.inFocus));
  }

  return notes.filter((note) => !note.archived);
}
