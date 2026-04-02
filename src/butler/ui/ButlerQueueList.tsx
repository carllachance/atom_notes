import { Artifact, ButlerItem } from '../../types';
import { ButlerQueueCard } from './ButlerQueueCard';

type ButlerQueueListProps = {
  items: ButlerItem[];
  artifacts: Artifact[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
};

export function ButlerQueueList({ items, artifacts, selectedItemId, onSelectItem }: ButlerQueueListProps) {
  const clarifyingCount = items.filter((item) => item.status === 'clarifying').length;
  const reviewCount = items.filter((item) => item.status === 'awaiting_review').length;
  const activeCount = items.filter((item) => item.status === 'running' || item.status === 'planned').length;
  return (
    <section className="butler-queue__list-shell" aria-label="Delegation request list">
      <div className="butler-queue__list-head">
        <div>
          <strong>Requests</strong>
          <p>Select an item to inspect its plan, staged artifacts, and next step.</p>
        </div>
        <div className="butler-queue__summary">
          <span>{items.length} total</span>
          <span>{activeCount} active</span>
          <span>{reviewCount} review</span>
          <span>{clarifyingCount} clarifying</span>
        </div>
      </div>
      <div className="butler-queue__list" role="list" aria-label="Delegation requests">
        {items.map((item) => (
          <ButlerQueueCard
            key={item.id}
            item={item}
            artifactCount={artifacts.filter((artifact) => item.artifactIds.includes(artifact.id)).length}
            isActive={item.id === selectedItemId}
            onSelect={() => onSelectItem(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
