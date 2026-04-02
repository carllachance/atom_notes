import { ButlerItem, WorkflowPlan } from '../../types';

export function createMeetingNotesRefinementWorkflow(item: ButlerItem): WorkflowPlan {
  return {
    id: crypto.randomUUID(),
    butlerItemId: item.id,
    title: 'Meeting Notes Refinement Workflow',
    goal: 'Refine rough meeting notes into a calm, structured draft with visible follow-ups.',
    steps: [
      {
        id: crypto.randomUUID(),
        type: 'gather_context',
        title: 'Retrieve source notes',
        description: 'Locate the rough note or meeting-related source material.',
        inputs: ['Notes'],
        expectedOutputs: ['Meeting note source'],
        status: 'pending',
        assignedAgentRole: 'context agent',
        toolBindings: ['refine_meeting_notes'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: false
      },
      {
        id: crypto.randomUUID(),
        type: 'extract',
        title: 'Refine and extract follow-ups',
        description: 'Produce a structured note draft and, when useful, a checklist artifact.',
        inputs: ['Meeting note source'],
        expectedOutputs: ['Note draft artifact', 'Checklist artifact'],
        status: 'pending',
        assignedAgentRole: 'drafting agent',
        toolBindings: ['refine_meeting_notes'],
        evidence: [],
        errors: [],
        isReversible: true,
        needsApproval: false
      }
    ],
    requiredCapabilities: ['note refinement', 'structured extraction'],
    requiredTools: ['refine_meeting_notes'],
    approvalCheckpoints: ['Review extracted follow-ups and owner names before sharing.'],
    fallbackBehavior: 'Pause in blocked state if no meeting notes are found.',
    successCriteria: ['A refined note artifact exists.', 'Follow-ups are visible.'],
    failureModes: ['No source notes found'],
    generatedBy: 'rule',
    templateId: 'meeting-notes-mvp'
  };
}
