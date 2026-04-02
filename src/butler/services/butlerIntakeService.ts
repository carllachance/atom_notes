import { ButlerItem, ButlerSourceContext } from '../../types';

export function createButlerItem(input: {
  rawIntentText: string;
  sourceContext?: ButlerSourceContext[];
  itemId?: string;
  createdAt?: number;
}): ButlerItem {
  const now = Date.now();
  return {
    id: input.itemId ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    createdBy: 'local-user',
    rawIntentText: input.rawIntentText.trim(),
    interpretedIntent: '',
    category: 'custom',
    priority: 'normal',
    status: 'intake',
    confidence: 'medium',
    reviewRequirement: 'recommended',
    trustTier: 'reversible_only',
    sourceContext: input.sourceContext ?? [],
    workflowPlanId: null,
    artifactIds: [],
    executionLogIds: [],
    assumptions: [],
    uncertainties: [],
    clarificationQuestions: [],
    approvalState: 'pending',
    memoryLinks: [],
    reuseSignals: [],
    delegationLabel: 'Butler'
  };
}
