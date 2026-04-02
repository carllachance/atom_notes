import { Artifact, ButlerItem, ExecutionLog, MemoryPreference, WorkflowPlan } from '../../types';
import { ButlerArtifactPanel } from './ButlerArtifactPanel';
import { ButlerAssumptionsPanel } from './ButlerAssumptionsPanel';
import { ButlerExecutionTimeline } from './ButlerExecutionTimeline';
import { ButlerReviewPanel } from './ButlerReviewPanel';
import { ButlerWorkflowPlanPanel } from './ButlerWorkflowPlanPanel';

type ButlerItemDetailProps = {
  item: ButlerItem | null;
  plan: WorkflowPlan | null;
  artifacts: Artifact[];
  logs: ExecutionLog[];
  memoryPreferences: MemoryPreference[];
  onOpenSourceNote?: (noteId: string) => void;
  onSubmitClarification?: (itemId: string, answers: Record<string, string>) => void | Promise<void>;
};

export function ButlerItemDetail({ item, plan, artifacts, logs, memoryPreferences, onOpenSourceNote, onSubmitClarification }: ButlerItemDetailProps) {
  if (!item) return null;
  return (
    <article className="butler-detail" aria-label={`${item.rawIntentText} detail`}>
      <header className="butler-detail__header">
        <div>
          <span className={`butler-card__status butler-card__status--${item.status.replace(/_/g, '-')}`}>{item.status.replace(/_/g, ' ')}</span>
          <strong>{item.rawIntentText}</strong>
          <p>{item.interpretedIntent}</p>
        </div>
        <div className="butler-detail__badges">
          <span>{item.delegationLabel}</span>
          <span>{item.trustTier.replace(/_/g, ' ')}</span>
          <span>{item.reviewRequirement} review</span>
        </div>
      </header>

      <ButlerWorkflowPlanPanel plan={plan} />

      <div className="butler-detail__grid">
        <ButlerArtifactPanel artifacts={artifacts} />
        <ButlerAssumptionsPanel item={item} />
      </div>

      <div className="butler-detail__grid">
        <ButlerExecutionTimeline logs={logs} />
        <ButlerReviewPanel
          item={item}
          memoryPreferences={memoryPreferences}
          onOpenSourceNote={onOpenSourceNote}
          onSubmitClarification={onSubmitClarification}
        />
      </div>
    </article>
  );
}
