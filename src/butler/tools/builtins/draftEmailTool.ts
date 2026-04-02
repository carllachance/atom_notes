import { ButlerTool } from '../butlerToolRegistry';

export type DraftEmailInput = {
  goal: string;
  recipients?: string[];
  tone?: 'concise' | 'neutral' | 'warm';
  sourceSummary?: string;
};

export type DraftEmailOutput = {
  subject: string;
  body: string;
  assumptions: string[];
  uncertainties: string[];
};

function titleCase(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const draftEmailTool: ButlerTool<DraftEmailInput, DraftEmailOutput> = {
  id: 'draft_email',
  label: 'Draft Email',
  run(input) {
    const recipients = input.recipients ?? [];
    const lead = input.sourceSummary?.trim()
      ? `${input.sourceSummary.trim()}\n\n`
      : '';
    return {
      subject: titleCase(input.goal).slice(0, 72),
      body: `${lead}I wanted to share a quick update on ${input.goal.toLowerCase()}.\n\nHere is the current state, what changed, and what still needs review.\n\nPlease let me know if you want me to tighten the wording before this goes out.`,
      assumptions: recipients.length ? [`Draft prepared with ${recipients.length} likely recipient${recipients.length === 1 ? '' : 's'}.`] : ['Recipients still need review before any send action.'],
      uncertainties: recipients.length ? [] : ['Recipient list is not confirmed yet.']
    };
  }
};
