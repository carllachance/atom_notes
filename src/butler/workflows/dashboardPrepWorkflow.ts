import { ButlerItem, WorkflowPlan } from '../../types';

export function createDashboardPrepWorkflow(item: ButlerItem): WorkflowPlan {
  return {
    id: crypto.randomUUID(),
    butlerItemId: item.id,
    title: 'Dashboard Prep Workflow',
    goal: 'Locate the latest dashboard, verify freshness, and stage the delivery package for review.',
    steps: [
      {
        id: crypto.randomUUID(),
        type: 'search',
        title: 'Locate latest dashboard',
        description: 'Find the freshest dashboard or reporting note that matches the request.',
        inputs: ['Notes', 'Attachments'],
        expectedOutputs: ['Dashboard source'],
        status: 'pending',
        assignedAgentRole: 'context agent',
        toolBindings: ['find_latest_dashboard'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: false
      },
      {
        id: crypto.randomUUID(),
        type: 'verify',
        title: 'Verify freshness',
        description: 'Check whether the located artifact looks current enough to package.',
        inputs: ['Dashboard source'],
        expectedOutputs: ['Freshness result'],
        status: 'pending',
        assignedAgentRole: 'verification agent',
        toolBindings: ['verify_artifact_freshness'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: false
      },
      {
        id: crypto.randomUUID(),
        type: 'package',
        title: 'Package report and draft cover email',
        description: 'Stage the package summary and the email draft without sending.',
        inputs: ['Dashboard source', 'Freshness result'],
        expectedOutputs: ['Report package artifact', 'Email draft artifact'],
        status: 'pending',
        assignedAgentRole: 'workflow agent',
        toolBindings: ['package_delivery_draft', 'draft_email'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: true
      }
    ],
    requiredCapabilities: ['artifact retrieval', 'verification', 'email drafting'],
    requiredTools: ['find_latest_dashboard', 'verify_artifact_freshness', 'package_delivery_draft', 'draft_email'],
    approvalCheckpoints: ['Review freshness and the saved draft before any send action.'],
    fallbackBehavior: 'Stop at blocked or review if the artifact is missing or stale.',
    successCriteria: ['A report package artifact exists.', 'An email draft exists.', 'Freshness is explicit.'],
    failureModes: ['No dashboard found', 'Dashboard stale'],
    generatedBy: 'rule',
    templateId: 'dashboard-prep-mvp'
  };
}
