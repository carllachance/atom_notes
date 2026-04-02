import { OutlookUnreadAnalysis } from '../../../types';
import { ButlerTool } from '../butlerToolRegistry';

export type StageOutlookUnreadSummaryInput = {
  goal: string;
  analysis?: OutlookUnreadAnalysis | null;
};

export type StageOutlookUnreadSummaryOutput = {
  summaryBody: string;
  checklistBody: string;
  assumptions: string[];
  uncertainties: string[];
};

export const stageOutlookUnreadSummaryTool: ButlerTool<StageOutlookUnreadSummaryInput, StageOutlookUnreadSummaryOutput> = {
  id: 'stage_outlook_unread_summary',
  label: 'Stage Outlook Unread Summary',
  run(input) {
    if (input.analysis?.source === 'live') {
      const messages = input.analysis.messages.slice(0, 8);
      return {
        summaryBody: [
          'Outlook unread summary',
          '',
          'Mailbox scan',
          `- Reviewed ${input.analysis.unreadCount} unread Outlook message${input.analysis.unreadCount === 1 ? '' : 's'}.`,
          `- Flagged ${input.analysis.urgentCount} message${input.analysis.urgentCount === 1 ? '' : 's'} as likely high priority.`,
          `- ${input.analysis.summary}`,
          '',
          'What Butler staged',
          '- A compact summary of unread mail that may need your attention.',
          '- A follow-up checklist so you can quickly see if anything is being missed.'
        ].join('\n'),
        checklistBody: [
          'Unread messages to review',
          ...(
            messages.length
              ? messages.map((message) => `- ${message.from}: ${message.subject}${message.importance === 'high' ? ' [high]' : ''}${message.preview ? ` — ${message.preview}` : ''}`)
              : ['- No unread messages were returned by the Outlook scan.']
          )
        ].join('\n'),
        assumptions: [
          'Used unread Outlook inbox metadata to summarize what may need attention.',
          'Stopped at a review artifact rather than marking, replying, or archiving anything.'
        ],
        uncertainties: []
      };
    }

    return {
      summaryBody: [
        'Outlook unread summary',
        '',
        'Goal',
        `- ${input.goal.trim()}`,
        '',
        'Staged approach',
        '- Review unread Outlook mail, highlight likely urgent items, and summarize the current inbox state.',
        '- Stop at a review artifact before any reply, archive, or status change.',
        '',
        'What is still needed',
        '- Live Outlook access or a provided mailbox sample to generate a real unread summary.'
      ].join('\n'),
      checklistBody: [
        'Unread review checklist',
        '- Confirm Outlook mailbox access',
        '- Group unread mail into urgent, waiting, and FYI',
        '- Highlight messages that look blocked, overdue, or decision-sensitive',
        '- Stop before any mailbox mutation'
      ].join('\n'),
      assumptions: [
        'The intended outcome is a summary of unread Outlook mail, not an autonomous mailbox action.'
      ],
      uncertainties: input.analysis?.unavailableReason
        ? [`Live Outlook analysis was unavailable: ${input.analysis.unavailableReason}`]
        : ['Live Outlook access is still needed to summarize the actual unread inbox.']
    };
  }
};
