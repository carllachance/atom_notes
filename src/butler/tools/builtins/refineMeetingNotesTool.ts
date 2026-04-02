import { NoteCardModel } from '../../../types';
import { ButlerTool } from '../butlerToolRegistry';

export type RefineMeetingNotesInput = {
  note: NoteCardModel | null;
};

export type RefineMeetingNotesOutput = {
  refinedBody: string;
  checklistBody: string | null;
  assumptions: string[];
  uncertainties: string[];
};

export const refineMeetingNotesTool: ButlerTool<RefineMeetingNotesInput, RefineMeetingNotesOutput> = {
  id: 'refine_meeting_notes',
  label: 'Refine Meeting Notes',
  run(input) {
    if (!input.note) {
      return {
        refinedBody: '',
        checklistBody: null,
        assumptions: [],
        uncertainties: ['No source meeting notes were found.']
      };
    }
    const lines = input.note.body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const summary = lines.slice(0, 2).join(' ');
    const followUps = lines.slice(2, 5).map((line) => `- ${line.replace(/^[-*]\s*/, '')}`);
    return {
      refinedBody: [
        'Summary',
        `- ${summary || 'Source notes were cleaned into a calmer draft.'}`,
        '',
        'Decisions',
        '- Preserve the strongest takeaway from the source note.',
        '',
        'Follow-ups',
        ...(followUps.length ? followUps : ['- Review the raw note and confirm the next action.']),
        '',
        'Uncertainties',
        '- Confirm any abbreviated names or unresolved owners before sharing.'
      ].join('\n'),
      checklistBody: [
        'Follow-up checklist',
        ...(followUps.length ? followUps : ['- Confirm next action owner'])
      ].join('\n'),
      assumptions: ['The rough note should be turned into summary, decisions, and follow-ups.'],
      uncertainties: ['Any abbreviated attendee or owner names still need review.']
    };
  }
};
