import { Artifact, ButlerItem, ExecutionLog, WorkflowPlan } from '../../types';

export type ButlerState = {
  items: Record<string, ButlerItem>;
  workflowPlans: Record<string, WorkflowPlan>;
  artifacts: Record<string, Artifact>;
  logs: Record<string, ExecutionLog>;
  selectedItemId: string | null;
  activeFilter: 'all' | 'new' | 'in_progress' | 'review' | 'blocked' | 'completed';
};

export function createButlerState(items: ButlerItem[], workflowPlans: WorkflowPlan[], artifacts: Artifact[], logs: ExecutionLog[]): ButlerState {
  return {
    items: Object.fromEntries(items.map((item) => [item.id, item])),
    workflowPlans: Object.fromEntries(workflowPlans.map((plan) => [plan.id, plan])),
    artifacts: Object.fromEntries(artifacts.map((artifact) => [artifact.id, artifact])),
    logs: Object.fromEntries(logs.map((log) => [log.id, log])),
    selectedItemId: items[0]?.id ?? null,
    activeFilter: 'all'
  };
}
