import './BriefSection.css';

export interface BriefSectionData {
  id: string;
  sectionType: 'stale_flag' | 'upcoming_context' | 'active_cluster' | 'synthesis_ready' | 'document_processed';
  label: string;
  summary: string;
  items: Array<{ id: string; title: string; age?: string }>;
  hasActionChip?: boolean;
  actionLabel?: string;
}

interface BriefSectionProps {
  section: BriefSectionData;
  onItemClick?: (itemId: string) => void;
  onActionClick?: (sectionId: string) => void;
}

export function BriefSection({ section, onItemClick, onActionClick }: BriefSectionProps) {
  return (
    <div className="brief-section">
      <div className="brief-section__label">{section.label}</div>
      {section.summary && <div className="brief-section__summary">{section.summary}</div>}
      {section.items.length > 0 && (
        <div className="brief-section__items">
          {section.items.map((item) => (
            <div key={item.id} className="brief-section__item" onClick={() => onItemClick?.(item.id)}>
              {item.title}
              {item.age && <span className="brief-section__age"> · {item.age}</span>}
            </div>
          ))}
        </div>
      )}
      {section.hasActionChip && section.actionLabel && (
        <div className="brief-section__footer">
          <button
            className="brief-action-chip"
            onClick={() => onActionClick?.(section.id)}
          >
            {section.actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
