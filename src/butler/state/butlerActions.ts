import { Artifact, ButlerItem, ExecutionLog, WorkflowPlan } from '../../types';

export function appendButlerResult(
  current: {
    items: ButlerItem[];
    workflowPlans: WorkflowPlan[];
    artifacts: Artifact[];
    executionLogs: ExecutionLog[];
  },
  next: {
    item: ButlerItem;
    workflowPlan: WorkflowPlan;
    artifacts: Artifact[];
    logs: ExecutionLog[];
  }
) {
  return {
    items: [next.item, ...current.items.filter((item) => item.id !== next.item.id)],
    workflowPlans: [next.workflowPlan, ...current.workflowPlans.filter((plan) => plan.id !== next.workflowPlan.id)],
    artifacts: [...next.artifacts, ...current.artifacts.filter((artifact) => !next.artifacts.some((candidate) => candidate.id === artifact.id))],
    executionLogs: [...next.logs, ...current.executionLogs.filter((log) => !next.logs.some((candidate) => candidate.id === log.id))]
  };
}
