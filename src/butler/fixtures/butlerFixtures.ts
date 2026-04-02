import { MemoryPreference, NoteCardModel } from '../../types';
import { runButlerRequest } from '../services/butlerOrchestrator';

export function createButlerFixtures(notes: NoteCardModel[], memoryPreferences: MemoryPreference[] = []) {
  const noteRefinementSource = notes.find((note) => note.id === 'note_prod_001') ?? notes[0] ?? null;
  const requests = [
    { rawIntentText: 'Send out the dashboard' },
    { rawIntentText: 'Clean up my Gmail inbox and unsubscribe from spam lists' },
    { rawIntentText: 'Check my Outlook email and let me know if I am missing anything' },
    {
      rawIntentText: 'Refine meeting notes',
      sourceContext: noteRefinementSource ? [{ kind: 'notes' as const, label: 'Working notes', sourceIds: [noteRefinementSource.id] }] : []
    },
    { rawIntentText: 'Write an email about the vendor delay' },
    { rawIntentText: 'Prep the morning summary' },
    { rawIntentText: 'Send that update' }
  ];

  const results = requests.map((request) => runButlerRequest({
    rawIntentText: request.rawIntentText,
    sourceContext: request.sourceContext,
    notes,
    memoryPreferences
  }));

  return {
    items: results.map((result) => result.item),
    workflowPlans: results.map((result) => result.workflowPlan),
    artifacts: results.flatMap((result) => result.artifacts),
    logs: results.flatMap((result) => result.logs),
    memoryPreferences
  };
}
