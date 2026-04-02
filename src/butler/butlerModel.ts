import {
  Artifact,
  ButlerConfidence,
  ButlerItem,
  ButlerStatus,
  ExecutionLog,
  MemoryPreference,
  WorkflowPlan,
  WorkflowStep
} from '../types';

const STATUS_ORDER: ButlerStatus[] = [
  'awaiting_review',
  'running',
  'planned',
  'clarifying',
  'blocked',
  'intake',
  'completed',
  'stale',
  'canceled'
];

function normalizeConfidence(value: unknown): ButlerConfidence {
  return value === 'low' || value === 'high' ? value : 'medium';
}

function normalizeStatus(value: unknown): ButlerStatus {
  return STATUS_ORDER.includes(value as ButlerStatus) ? value as ButlerStatus : 'intake';
}

function normalizeStep(step: Partial<WorkflowStep>, index: number): WorkflowStep {
  return {
    id: String(step.id ?? `workflow-step-${index + 1}`),
    type: step.type ?? 'handoff',
    title: String(step.title ?? 'Untitled step'),
    description: String(step.description ?? ''),
    inputs: Array.isArray(step.inputs) ? step.inputs.map(String) : [],
    expectedOutputs: Array.isArray(step.expectedOutputs) ? step.expectedOutputs.map(String) : [],
    status: step.status === 'running' || step.status === 'completed' || step.status === 'blocked' ? step.status : 'pending',
    assignedAgentRole: typeof step.assignedAgentRole === 'string' ? step.assignedAgentRole : undefined,
    toolBindings: Array.isArray(step.toolBindings) ? step.toolBindings.map(String) : [],
    evidence: Array.isArray(step.evidence) ? step.evidence.map(String) : [],
    errors: Array.isArray(step.errors) ? step.errors.map(String) : [],
    isReversible: step.isReversible !== false,
    needsApproval: Boolean(step.needsApproval)
  };
}

export function normalizeButlerItem(raw: Partial<ButlerItem>, index: number): ButlerItem {
  return {
    id: String(raw.id ?? `butler-item-${index + 1}`),
    createdAt: Number(raw.createdAt ?? Date.now()),
    updatedAt: Number(raw.updatedAt ?? raw.createdAt ?? Date.now()),
    createdBy: String(raw.createdBy ?? 'system'),
    rawIntentText: String(raw.rawIntentText ?? ''),
    interpretedIntent: String(raw.interpretedIntent ?? ''),
    category: raw.category ?? 'custom',
    priority: raw.priority ?? 'normal',
    status: normalizeStatus(raw.status),
    confidence: normalizeConfidence(raw.confidence),
    reviewRequirement: raw.reviewRequirement ?? 'recommended',
    trustTier: raw.trustTier ?? 'reversible_only',
    sourceContext: Array.isArray(raw.sourceContext)
      ? raw.sourceContext.map((context, contextIndex) => ({
          kind: context.kind ?? 'notes',
          label: String(context.label ?? `Context ${contextIndex + 1}`),
          sourceIds: Array.isArray(context.sourceIds) ? context.sourceIds.map(String) : []
        }))
      : [],
    workflowPlanId: typeof raw.workflowPlanId === 'string' ? raw.workflowPlanId : null,
    artifactIds: Array.isArray(raw.artifactIds) ? raw.artifactIds.map(String) : [],
    executionLogIds: Array.isArray(raw.executionLogIds) ? raw.executionLogIds.map(String) : [],
    assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(String) : [],
    uncertainties: Array.isArray(raw.uncertainties) ? raw.uncertainties.map(String) : [],
    clarificationQuestions: Array.isArray(raw.clarificationQuestions)
      ? raw.clarificationQuestions.map((question, questionIndex) => ({
          id: String(question.id ?? `clarification-question-${questionIndex + 1}`),
          prompt: String(question.prompt ?? 'Clarify this request'),
          detail: String(question.detail ?? ''),
          placeholder: typeof question.placeholder === 'string' ? question.placeholder : undefined,
          options: Array.isArray(question.options) ? question.options.map(String) : [],
          answer: typeof question.answer === 'string' ? question.answer : undefined
        }))
      : [],
    approvalState: raw.approvalState ?? 'pending',
    memoryLinks: Array.isArray(raw.memoryLinks) ? raw.memoryLinks.map(String) : [],
    reuseSignals: Array.isArray(raw.reuseSignals) ? raw.reuseSignals.map(String) : [],
    delegationLabel: String(raw.delegationLabel ?? 'Butler')
  };
}

export function normalizeWorkflowPlan(raw: Partial<WorkflowPlan>, index: number): WorkflowPlan {
  return {
    id: String(raw.id ?? `workflow-plan-${index + 1}`),
    butlerItemId: String(raw.butlerItemId ?? ''),
    title: String(raw.title ?? 'Workflow plan'),
    goal: String(raw.goal ?? ''),
    steps: Array.isArray(raw.steps) ? raw.steps.map((step, stepIndex) => normalizeStep(step, stepIndex)) : [],
    requiredCapabilities: Array.isArray(raw.requiredCapabilities) ? raw.requiredCapabilities.map(String) : [],
    requiredTools: Array.isArray(raw.requiredTools) ? raw.requiredTools.map(String) : [],
    approvalCheckpoints: Array.isArray(raw.approvalCheckpoints) ? raw.approvalCheckpoints.map(String) : [],
    fallbackBehavior: String(raw.fallbackBehavior ?? ''),
    successCriteria: Array.isArray(raw.successCriteria) ? raw.successCriteria.map(String) : [],
    failureModes: Array.isArray(raw.failureModes) ? raw.failureModes.map(String) : [],
    generatedBy: raw.generatedBy ?? 'rule',
    templateId: typeof raw.templateId === 'string' ? raw.templateId : null
  };
}

export function normalizeArtifact(raw: Partial<Artifact>, index: number): Artifact {
  return {
    id: String(raw.id ?? `artifact-${index + 1}`),
    type: raw.type ?? 'summary',
    title: String(raw.title ?? 'Artifact'),
    body: String(raw.body ?? ''),
    linkedSourceIds: Array.isArray(raw.linkedSourceIds) ? raw.linkedSourceIds.map(String) : [],
    generatedAt: Number(raw.generatedAt ?? Date.now()),
    version: Number(raw.version ?? 1),
    status: raw.status ?? 'draft',
    provenance: String(raw.provenance ?? ''),
    changeSummary: String(raw.changeSummary ?? ''),
    metadata: raw.metadata && typeof raw.metadata === 'object'
      ? Object.fromEntries(
          Object.entries(raw.metadata).map(([key, value]) => [
            key,
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null
              ? value
              : String(value)
          ])
        )
      : undefined
  };
}

export function normalizeExecutionLog(raw: Partial<ExecutionLog>, index: number): ExecutionLog {
  return {
    id: String(raw.id ?? `execution-log-${index + 1}`),
    butlerItemId: String(raw.butlerItemId ?? ''),
    timestamp: Number(raw.timestamp ?? Date.now()),
    actorType: raw.actorType ?? 'orchestrator',
    action: String(raw.action ?? ''),
    result: String(raw.result ?? ''),
    evidenceLinks: Array.isArray(raw.evidenceLinks) ? raw.evidenceLinks.map(String) : [],
    notes: String(raw.notes ?? '')
  };
}

export function normalizeMemoryPreference(raw: Partial<MemoryPreference>, index: number): MemoryPreference {
  return {
    id: String(raw.id ?? `memory-preference-${index + 1}`),
    scope: raw.scope ?? 'global',
    key: String(raw.key ?? ''),
    value: String(raw.value ?? ''),
    confidence: normalizeConfidence(raw.confidence),
    source: raw.source ?? 'explicit',
    lastUsedAt: Number(raw.lastUsedAt ?? Date.now()),
    editable: raw.editable !== false
  };
}

export function sortButlerItems(items: ButlerItem[]) {
  return [...items].sort((a, b) => {
    const statusDelta = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (statusDelta !== 0) return statusDelta;
    return b.updatedAt - a.updatedAt;
  });
}
