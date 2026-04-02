import { ButlerItem, WorkflowPlan } from '../../types';
import { createDashboardPrepWorkflow } from '../workflows/dashboardPrepWorkflow';
import { createEmailDraftWorkflow } from '../workflows/emailDraftWorkflow';
import { createGmailInboxCleanupWorkflow } from '../workflows/gmailInboxCleanupWorkflow';
import { createMeetingNotesRefinementWorkflow } from '../workflows/meetingNotesRefinementWorkflow';
import { createOutlookUnreadSummaryWorkflow } from '../workflows/outlookUnreadSummaryWorkflow';

export function createWorkflowPlan(item: ButlerItem): WorkflowPlan {
  switch (item.category) {
    case 'email':
      return createEmailDraftWorkflow(item);
    case 'reporting':
      return createDashboardPrepWorkflow(item);
    case 'notes':
      return createMeetingNotesRefinementWorkflow(item);
    case 'admin':
      return /outlook|microsoft email|unread|missing anything/i.test(item.rawIntentText)
        ? createOutlookUnreadSummaryWorkflow(item)
        : createGmailInboxCleanupWorkflow(item);
    default:
      return {
        id: crypto.randomUUID(),
        butlerItemId: item.id,
        title: 'Clarify request',
        goal: 'Pause and ask for clarification before doing work that might be wrong.',
        steps: item.clarificationQuestions.map((question, index) => ({
          id: `${item.id}-clarify-step-${index + 1}`,
          type: 'handoff',
          title: question.prompt,
          description: question.detail,
          inputs: question.answer ? [question.answer] : [],
          expectedOutputs: ['A user-provided answer that narrows the workflow scope.'],
          status: question.answer?.trim() ? 'completed' : 'pending',
          toolBindings: [],
          evidence: question.answer?.trim() ? [question.answer] : [],
          errors: [],
          isReversible: true,
          needsApproval: false
        })),
        requiredCapabilities: [],
        requiredTools: [],
        approvalCheckpoints: ['Clarify the intended deliverable first.'],
        fallbackBehavior: 'Stay in clarifying state.',
        successCriteria: ['The request maps to a supported workflow.'],
        failureModes: ['Ambiguous request'],
        generatedBy: 'rule',
        templateId: null
      };
  }
}
