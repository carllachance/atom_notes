import { ButlerItem } from '../../types';
import { getNextStepForItem } from '../mappers/butlerViewModelMappers';

type ButlerQueueCardProps = {
  item: ButlerItem;
  artifactCount: number;
  isActive: boolean;
  onSelect: () => void;
};

function getStatusLabel(status: ButlerItem['status']) {
  switch (status) {
    case 'awaiting_review':
      return 'Ready for review';
    case 'running':
      return 'In progress';
    case 'clarifying':
      return 'Clarifying';
    case 'planned':
      return 'Planned';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Completed';
    case 'stale':
      return 'Stale';
    case 'canceled':
      return 'Canceled';
    default:
      return 'New';
  }
}

export function ButlerQueueCard({ item, artifactCount, isActive, onSelect }: ButlerQueueCardProps) {
  return (
    <button type="button" role="listitem" className={`butler-card ${isActive ? 'butler-card--active' : ''}`} onClick={onSelect}>
      <div className="butler-card__head">
        <span className={`butler-card__status butler-card__status--${item.status.replace(/_/g, '-')}`}>{getStatusLabel(item.status)}</span>
        <small>{item.confidence}</small>
      </div>
      <strong>{item.rawIntentText}</strong>
      <p>{item.interpretedIntent}</p>
      <div className="butler-card__meta">
        <span>{item.priority}</span>
        <span>{artifactCount} artifacts</span>
        <span>{getNextStepForItem(item)}</span>
      </div>
    </button>
  );
}
