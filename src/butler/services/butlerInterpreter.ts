import { ButlerClarificationQuestion, ButlerItem } from '../../types';

export type ButlerInterpretationResult = Pick<
  ButlerItem,
  'interpretedIntent' | 'category' | 'confidence' | 'reviewRequirement' | 'trustTier' | 'assumptions' | 'uncertainties' | 'clarificationQuestions'
>;

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function buildClarificationQuestions(text: string): ButlerClarificationQuestion[] {
  if (/gmail|unsubscribe|spam/.test(text)) {
    return [
      {
        id: 'clarify-outcome',
        prompt: 'What should Butler prepare here?',
        detail: 'Choose the reversible outcome before any mailbox action is considered.',
        options: ['Inbox triage summary', 'Unsubscribe candidate list', 'Both'],
        answer: ''
      },
      {
        id: 'clarify-boundary',
        prompt: 'How far should the workflow go?',
        detail: 'The safe default is to stage recommendations instead of changing the mailbox.',
        options: ['Draft only', 'Prepare actions for review', 'Actually unsubscribe'],
        answer: ''
      },
      {
        id: 'clarify-focus',
        prompt: 'Which senders or patterns should it focus on first?',
        detail: 'A small scope keeps the review surface calm and inspectable.',
        placeholder: 'Example: marketing newsletters, retail promos, unknown sender blasts',
        answer: ''
      }
    ];
  }

  return [
    {
      id: 'clarify-deliverable',
      prompt: 'What deliverable do you want Butler to stage?',
      detail: 'This helps map the request to a safe workflow instead of guessing.',
      placeholder: 'Example: draft email, refined note, review package',
      answer: ''
    },
    {
      id: 'clarify-scope',
      prompt: 'What source or scope should it use?',
      detail: 'Point to the notes, thread, files, or audience that matter most.',
      placeholder: 'Example: this thread, today’s meeting notes, the finance workspace',
      answer: ''
    }
  ];
}

export function interpretButlerItem(item: ButlerItem): ButlerInterpretationResult {
  const text = item.rawIntentText.toLowerCase();
  if (includesAny(text, [/outlook/, /microsoft email/, /check my .*email/, /unread/, /missing anything/])) {
    return {
      interpretedIntent: 'Read unread Outlook mail, summarize what may need attention, and stop at a review-ready digest.',
      category: 'admin',
      confidence: 'high',
      reviewRequirement: 'required',
      trustTier: 'review_before_action',
      assumptions: [
        'Summarize unread mail rather than replying, archiving, or changing mailbox state.',
        'Highlight likely important unread messages first.'
      ],
      uncertainties: [],
      clarificationQuestions: []
    };
  }

  if (includesAny(text, [/gmail/, /unsubscribe/, /spam/, /clean up my inbox/, /cleanup my inbox/])) {
    return {
      interpretedIntent: 'Prepare an inbox cleanup brief, stage unsubscribe candidates, and stop before any mailbox-changing action.',
      category: 'admin',
      confidence: 'high',
      reviewRequirement: 'required',
      trustTier: 'review_before_action',
      assumptions: [
        'Treat cleanup as a staged review workflow rather than mutating the mailbox immediately.',
        'Keep transactional and security mail out of unsubscribe candidates.'
      ],
      uncertainties: [],
      clarificationQuestions: []
    };
  }

  if (includesAny(text, [/email/, /reply/, /respond/, /follow up/, /vendor delay/])) {
    const uncertainties = /vendor delay/.test(text)
      ? ['Delay duration and owner may still need confirmation.']
      : [];
    return {
      interpretedIntent: 'Draft a clear email, surface missing context, and stop at review.',
      category: 'email',
      confidence: uncertainties.length ? 'medium' : 'high',
      reviewRequirement: 'required',
      trustTier: 'review_before_action',
      assumptions: ['Prepare a draft rather than sending externally.'],
      uncertainties,
      clarificationQuestions: []
    };
  }

  if (includesAny(text, [/dashboard/, /report/, /morning summary/, /send out/])) {
    return {
      interpretedIntent: 'Prepare the latest reporting package, verify freshness, and stage the delivery draft for review.',
      category: 'reporting',
      confidence: 'high',
      reviewRequirement: 'required',
      trustTier: 'review_before_action',
      assumptions: ['Use the latest relevant report artifact if one exists.', 'Stop at a saved draft rather than sending.'],
      uncertainties: [],
      clarificationQuestions: []
    };
  }

  if (includesAny(text, [/meeting notes/, /refine notes/, /clean this up/, /follow-ups/])) {
    return {
      interpretedIntent: 'Turn rough notes into a structured summary with decisions, follow-ups, and visible uncertainties.',
      category: 'notes',
      confidence: 'high',
      reviewRequirement: 'recommended',
      trustTier: 'reversible_only',
      assumptions: ['Keep the output as a staged note artifact.'],
      uncertainties: [],
      clarificationQuestions: []
    };
  }

  return {
    interpretedIntent: 'Interpretation is still ambiguous; gather clarification before planning.',
    category: 'custom',
    confidence: 'low',
    reviewRequirement: 'required',
    trustTier: 'reversible_only',
    assumptions: [],
    uncertainties: ['The request does not yet map to a supported Butler workflow.'],
    clarificationQuestions: buildClarificationQuestions(text)
  };
}
