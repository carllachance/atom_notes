import { Artifact, ButlerItem, ExecutionLog, WorkflowPlan } from '../../types';
import { getNextStepLabel } from '../services/butlerVerificationService';

export function getArtifactsForItem(item: ButlerItem, artifacts: Artifact[]) {
  return artifacts.filter((artifact) => item.artifactIds.includes(artifact.id));
}

export function getLogsForItem(item: ButlerItem, logs: ExecutionLog[]) {
  return logs.filter((log) => item.executionLogIds.includes(log.id) || log.butlerItemId === item.id);
}

export function getPlanForItem(item: ButlerItem, plans: WorkflowPlan[]) {
  return plans.find((plan) => plan.id === item.workflowPlanId) ?? null;
}

export function getNextStepForItem(item: ButlerItem) {
  return getNextStepLabel(item.status, item.reviewRequirement);
}
