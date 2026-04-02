import { GmailCleanupAnalysis } from '../../../types';
import { ButlerTool } from '../butlerToolRegistry';

export type StageInboxCleanupInput = {
  goal: string;
  analysis?: GmailCleanupAnalysis | null;
};

export type StageInboxCleanupOutput = {
  summaryBody: string;
  checklistBody: string;
  assumptions: string[];
  uncertainties: string[];
};

function inferCleanupFocus(goal: string) {
  const text = goal.toLowerCase();
  const focus: string[] = [];
  if (/unsubscribe|spam/.test(text)) focus.push('marketing newsletters and spam-like senders');
  if (/inbox|clean up/.test(text)) focus.push('inbox triage and low-value mail');
  return focus.length ? focus : ['low-value inbox mail'];
}

export const stageInboxCleanupTool: ButlerTool<StageInboxCleanupInput, StageInboxCleanupOutput> = {
  id: 'stage_inbox_cleanup',
  label: 'Stage Inbox Cleanup',
  run(input) {
    if (input.analysis?.source === 'live') {
      const topCandidates = input.analysis.senderCandidates.slice(0, 6);
      return {
        summaryBody: [
          'Inbox cleanup brief',
          '',
          'Live inbox scan',
          `- Reviewed ${input.analysis.scannedMessageCount} inbox messages from the connected Gmail account.`,
          `- Found ${input.analysis.unsubscribeCandidateCount} sender pattern${input.analysis.unsubscribeCandidateCount === 1 ? '' : 's'} that look safe to review for unsubscribe.`,
          `- ${input.analysis.summary}`,
          '',
          'Recommended next step',
          '- Review the candidate senders below before any unsubscribe, archive, or label action.',
          '- Keep transactional, billing, and security mail out of cleanup actions.'
        ].join('\n'),
        checklistBody: [
          'Unsubscribe candidates',
          ...(
            topCandidates.length
              ? topCandidates.map((candidate) => `- ${candidate.sender} (${candidate.messageCount} messages${candidate.hasListUnsubscribe ? ', unsubscribe link detected' : ''})${candidate.latestSubject ? ` — latest: ${candidate.latestSubject}` : ''}`)
              : ['- No strong candidates surfaced from the live inbox scan.']
          )
        ].join('\n'),
        assumptions: [
          'Used connected Gmail metadata to shortlist likely bulk or newsletter senders.',
          'Stopped before any mailbox mutation.'
        ],
        uncertainties: []
      };
    }

    const focus = inferCleanupFocus(input.goal);
    return {
      summaryBody: [
        'Inbox cleanup brief',
        '',
        'Goal',
        `- ${input.goal.trim()}`,
        '',
        'Staged approach',
        `- Focus first on ${focus.join(' and ')}.`,
        '- Group messages into keep, unsubscribe candidate, and bulk archive candidate lanes.',
        '- Stop at a review surface before any mailbox-changing action.',
        '',
        'Suggested review checkpoints',
        '- Confirm which sender patterns are safe to unsubscribe from.',
        '- Confirm whether Butler should only draft actions or also apply labels/archive later.',
        '- Keep transactional, account, and security email out of unsubscribe candidates.'
      ].join('\n'),
      checklistBody: [
        'Unsubscribe candidate checklist',
        '- Marketing newsletters with obvious unsubscribe links',
        '- Retail promotions and sale blasts',
        '- Event campaigns or webinar drip mail',
        '- Low-value product announcements',
        '- Unknown sender list traffic that repeats frequently',
        '',
        'Do not include',
        '- Receipts, billing, account, and security mail',
        '- Personal threads or recruiter conversations',
        '- Messages tied to active work or open tasks'
      ].join('\n'),
      assumptions: [
        'Stage cleanup recommendations first instead of mutating the mailbox.',
        'Treat unsubscribe as a review-required action even when the request sounds direct.'
      ],
      uncertainties: input.analysis?.unavailableReason
        ? [`Live Gmail analysis was unavailable: ${input.analysis.unavailableReason}`]
        : ['A live sender shortlist will still need Gmail access or a provided mailbox sample before any real unsubscribe pass.']
    };
  }
};
