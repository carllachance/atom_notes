import { ButlerItem, WorkflowPlan } from '../../types';

export function createOutlookUnreadSummaryWorkflow(item: ButlerItem): WorkflowPlan {
  return {
    id: crypto.randomUUID(),
    butlerItemId: item.id,
    title: 'Outlook Unread Summary Workflow',
    goal: 'Review unread Outlook mail, summarize what might be missing, and stop at a calm review boundary.',
    steps: [
      {
        id: crypto.randomUUID(),
        type: 'search',
        title: 'Scan unread Outlook inbox',
        description: 'Inspect unread Outlook mailbox metadata and collect likely-important messages.',
        inputs: ['Request text'],
        expectedOutputs: ['Unread inbox scan'],
        status: 'pending',
        assignedAgentRole: 'context agent',
        toolBindings: ['stage_outlook_unread_summary'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: false
      },
      {
        id: crypto.randomUUID(),
        type: 'summarize',
        title: 'Stage unread summary',
        description: 'Create a readable unread summary and a checklist of messages to review next.',
        inputs: ['Unread inbox scan'],
        expectedOutputs: ['Summary artifact', 'Checklist artifact'],
        status: 'pending',
        assignedAgentRole: 'review explainer agent',
        toolBindings: ['stage_outlook_unread_summary'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: true
      }
    ],
    requiredCapabilities: ['mailbox review', 'unread summary'],
    requiredTools: ['stage_outlook_unread_summary'],
    approvalCheckpoints: ['Review the unread summary before replying, archiving, or changing mailbox state.'],
    fallbackBehavior: 'Stay review-first and report when Outlook access is unavailable.',
    successCriteria: ['An unread summary artifact exists.', 'Potentially important unread messages are visible.'],
    failureModes: ['Outlook access unavailable', 'Unread inbox metadata missing'],
    generatedBy: 'rule',
    templateId: 'outlook-unread-summary-mvp'
  };
}
