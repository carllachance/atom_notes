import { ButlerItem, WorkflowPlan } from '../../types';

export function createGmailInboxCleanupWorkflow(item: ButlerItem): WorkflowPlan {
  return {
    id: crypto.randomUUID(),
    butlerItemId: item.id,
    title: 'Gmail Inbox Cleanup Workflow',
    goal: 'Prepare a review-first inbox cleanup package with unsubscribe candidates and no hidden mailbox changes.',
    steps: [
      {
        id: crypto.randomUUID(),
        type: 'gather_context',
        title: 'Scope inbox cleanup',
        description: 'Interpret the cleanup request, preserve safety boundaries, and define the initial cleanup lanes.',
        inputs: ['Request text'],
        expectedOutputs: ['Cleanup brief'],
        status: 'pending',
        assignedAgentRole: 'context agent',
        toolBindings: ['stage_inbox_cleanup'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: false
      },
      {
        id: crypto.randomUUID(),
        type: 'create_artifact',
        title: 'Stage unsubscribe candidates',
        description: 'Prepare an inspectable candidate checklist and stop for review before any mailbox action.',
        inputs: ['Cleanup brief'],
        expectedOutputs: ['Summary artifact', 'Checklist artifact'],
        status: 'pending',
        assignedAgentRole: 'workflow agent',
        toolBindings: ['stage_inbox_cleanup'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: true
      }
    ],
    requiredCapabilities: ['inbox cleanup planning', 'mailbox triage'],
    requiredTools: ['stage_inbox_cleanup'],
    approvalCheckpoints: ['Review unsubscribe candidates before any mailbox mutation.'],
    fallbackBehavior: 'Stay review-first and avoid changing the mailbox automatically.',
    successCriteria: ['A cleanup brief exists.', 'Unsubscribe candidates are visible and inspectable.'],
    failureModes: ['Mailbox access unavailable for live sender verification'],
    generatedBy: 'rule',
    templateId: 'gmail-inbox-cleanup-mvp'
  };
}
