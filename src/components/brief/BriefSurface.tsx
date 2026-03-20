import { useState } from 'react';
import { NoteCardModel, Relationship } from '../../types';
import { ModeToggle } from './ModeToggle';
import { CapturePrompt } from './CapturePrompt';
import { BriefSection, BriefSectionData } from './BriefSection';
import { BriefLandscape } from './BriefLandscape';
import { SeasonalView } from '../SeasonalView';
import { computeSeasonalView } from '../../services/SeasonalViewService';
import './BriefSurface.css';
import './BriefSection.css';
import './BriefActionChip.css';

interface BriefSurfaceProps {
  notes: NoteCardModel[];
  relationships: Relationship[];
  sections?: BriefSectionData[];
  greeting?: string;
  onCapture: (text: string) => void;
  onItemClick?: (noteId: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  return 'Good evening.';
}

export function BriefSurface({
  notes,
  relationships,
  sections = [],
  greeting = getGreeting(),
  onCapture,
  onItemClick,
}: BriefSurfaceProps) {
  const [viewMode, setViewMode] = useState<'reading' | 'landscape'>('reading');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSeasonal, setShowSeasonal] = useState(false);

  function handleModeChange(mode: 'reading' | 'landscape') {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode(mode);
      setIsTransitioning(false);
    }, 200);
  }

  const seasonalData = computeSeasonalView({ notes, relationships });

  function handleMonthClick(bucket: { noteIds: string[] }) {
    setShowSeasonal(false);
    if (bucket.noteIds.length > 0 && onItemClick) {
      onItemClick(bucket.noteIds[0]);
    }
  }

  return (
    <div className="brief-surface">
      <div className="brief-surface__mode-toggle">
        <ModeToggle mode={viewMode} onChange={handleModeChange} />
      </div>

      {viewMode === 'reading' && (
        <div className={`brief-surface__content${isTransitioning ? ' brief-surface__content--transitioning' : ''}`}>
          <div className="brief-surface__greeting">{greeting}</div>
          <CapturePrompt onCapture={onCapture} />
          {sections.length > 0 && (
            <div className="brief-surface__sections">
              {sections.map((section) => (
                <BriefSection
                  key={section.id}
                  section={section}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          )}
          <button
            className="brief-surface__lookback"
            onClick={() => setShowSeasonal(true)}
          >
            Looking back
          </button>
        </div>
      )}

      {viewMode === 'landscape' && (
        <BriefLandscape
          sections={sections}
          greeting={greeting}
          onSectionClick={(sectionId) => {
            const section = sections.find((s) => s.id === sectionId);
            if (section?.items[0] && onItemClick) {
              onItemClick(section.items[0].id);
            }
          }}
        />
      )}

      {showSeasonal && seasonalData && (
        <SeasonalView
          data={seasonalData}
          onMonthClick={handleMonthClick}
          onClose={() => setShowSeasonal(false)}
        />
      )}
    </div>
  );
}
