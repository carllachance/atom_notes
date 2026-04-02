import { ButlerItem, WorkflowPlan } from '../../types';

export function createEmailDraftWorkflow(item: ButlerItem): WorkflowPlan {
  return {
    id: crypto.randomUUID(),
    butlerItemId: item.id,
    title: 'Email Draft Workflow',
    goal: 'Create a review-ready email draft without performing any send action.',
    steps: [
      {
        id: crypto.randomUUID(),
        type: 'gather_context',
        title: 'Gather context',
        description: 'Collect source notes or thread context for the request.',
        inputs: ['Source notes', 'Conversation context'],
        expectedOutputs: ['Context summary'],
        status: 'pending',
        assignedAgentRole: 'context agent',
        toolBindings: ['draft_email'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: false
      },
      {
        id: crypto.randomUUID(),
        type: 'draft',
        title: 'Draft email',
        description: 'Prepare the email draft and capture any assumptions or missing context.',
        inputs: ['Context summary'],
        expectedOutputs: ['Email draft artifact'],
        status: 'pending',
        assignedAgentRole: 'drafting agent',
        toolBindings: ['draft_email'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: true
      }
    ],
    requiredCapabilities: ['email drafting'],
    requiredTools: ['draft_email'],
    approvalCheckpoints: ['Review the draft before any external action.'],
    fallbackBehavior: 'Pause in clarifying state if the audience or impact remains too vague.',
    successCriteria: ['A reviewable email draft exists.', 'Missing context is visible.'],
    failureModes: ['Missing recipients', 'Unsupported request details'],
    generatedBy: 'rule',
    templateId: 'email-draft-mvp'
  };
}
