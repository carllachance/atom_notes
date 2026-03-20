import { useEffect } from 'react';
import { MonthBucket } from '../services/SeasonalViewService';
import './SeasonalView.css';

interface SeasonalViewProps {
  data: { buckets: MonthBucket[] };
  onMonthClick: (bucket: MonthBucket) => void;
  onClose: () => void;
}

function getWarmthColor(warmth: number): string {
  if (warmth < 0.3) return 'rgba(123, 104, 238, 0.6)';
  if (warmth < 0.6) return 'rgba(126, 184, 247, 0.7)';
  if (warmth < 0.85) return 'rgba(244, 185, 66, 0.7)';
  return 'rgba(92, 234, 212, 0.8)';
}

export function SeasonalView({ data, onMonthClick, onClose }: SeasonalViewProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="seasonal-view">
      <button className="seasonal-view__close" onClick={onClose}>
        Close
      </button>
      <div className="seasonal-view__title">Your thinking, over time.</div>
      <div className="seasonal-timeline">
        {data.buckets.map((bucket) => (
          <div
            key={`${bucket.year}-${bucket.month}`}
            className="seasonal-month"
            style={{
              height: `${40 + bucket.warmth * 160}px`,
              opacity: 0.25 + bucket.warmth * 0.75,
              background: `linear-gradient(to top, ${getWarmthColor(bucket.warmth)}, transparent)`,
            }}
            onClick={() => onMonthClick(bucket)}
          >
            <span className="seasonal-month__label">{bucket.label}</span>
            <span className="seasonal-month__count">{bucket.noteCount}</span>
            {bucket.dominantTopics.slice(0, 2).map((topic) => (
              <span key={topic} className="seasonal-month__topic">{topic}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
