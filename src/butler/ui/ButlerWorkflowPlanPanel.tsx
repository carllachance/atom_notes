import { WorkflowPlan } from '../../types';

type ButlerWorkflowPlanPanelProps = {
  plan: WorkflowPlan | null;
};

export function ButlerWorkflowPlanPanel({ plan }: ButlerWorkflowPlanPanelProps) {
  return (
    <section className="butler-detail__section">
      <div className="butler-detail__section-head">
        <strong>Workflow</strong>
        <span>{plan?.steps.length ?? 0} steps</span>
      </div>
      {plan ? (
        <div className="butler-step-list">
          {plan.steps.map((step) => (
            <div key={step.id} className={`butler-step butler-step--${step.status}`}>
              <div className="butler-step__title">
                <strong>{step.title}</strong>
                <span>{step.status}</span>
              </div>
              <p>{step.description}</p>
              <small>{step.assignedAgentRole ?? 'orchestrator'}{step.needsApproval ? ' · review checkpoint' : ''}</small>
            </div>
          ))}
        </div>
      ) : <p className="butler-detail__placeholder">No workflow plan has been attached yet.</p>}
    </section>
  );
}
