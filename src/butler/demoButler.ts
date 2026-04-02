import { MemoryPreference, NoteCardModel } from '../types';
import { createButlerFixtures } from './fixtures/butlerFixtures';

export function createDemoButlerState(notes: NoteCardModel[], memoryPreferences: MemoryPreference[] = []) {
  return createButlerFixtures(notes, memoryPreferences);
}
